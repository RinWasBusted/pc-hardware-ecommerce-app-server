import Groq from 'groq-sdk';
import prisma from '../../utils/prisma.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

const STOP_WORDS = new Set([
    'tôi', 'bạn', 'mình', 'cho', 'tư', 'vấn', 'với', 'và', 'hay',
    'hoặc', 'cần', 'muốn', 'hỏi', 'về', 'của', 'tầm', 'trong', 'có',
    'thì', 'là', 'một', 'các', 'những', 'nào', 'được', 'làm', 'thế',
    'nào', 'ra', 'sao', 'giá', 'giới', 'thiệu', 'gợi', 'ý', 'triệu',
    'đồng', 'khoảng', 'khoảng', 'dưới', 'trên', 'ơi', 'giúp', 'nhé',
    'không', 'mà', 'này', 'đó', 'đây', 'vậy', 'lắm', 'quá', 'rất',
]);

const extractKeywords = (message: string): string[] => {
    const words = message
        .toLowerCase()
        .split(/[\s,.\-!?;:()]+/)
        .filter(w => w.length >= 2 && !STOP_WORDS.has(w));

    return words.length > 0 ? [...new Set(words)] : [message.toLowerCase()];
};

const parsePriceCondition = (message: string) => {
    // 1. ƯU TIÊN KIỂM TRA DẠNG KHOẢNG GIÁ (VD: từ 25 đến 30 triệu, 25 - 30 tr)
    const rangeRegex = /(?:từ\s+)?(\d+(?:[\.,]\d+)?)\s*(?:đến|-)\s*(\d+(?:[\.,]\d+)?)\s*(triệu|tr|củ)/i;
    const rangeMatch = message.match(rangeRegex);

    if (rangeMatch) {
        const num1 = parseFloat(rangeMatch[1]!.replace(',', '.'));
        const num2 = parseFloat(rangeMatch[2]!.replace(',', '.'));
        
        // Dùng Math.min và Math.max để phòng trường hợp khách gõ ngược "30 đến 25 triệu"
        const priceCondition = {
            gte: Math.min(num1, num2) * 1000000,
            lte: Math.max(num1, num2) * 1000000
        };
        const cleanMessage = message.replace(rangeMatch[0], '');
        return { priceCondition, cleanMessage };
    }

    // 2. NẾU KHÔNG PHẢI KHOẢNG GIÁ, KIỂM TRA DẠNG ĐƠN (VD: trên 28 triệu, dưới 30 củ)
    const singleRegex = /(trên|dưới|khoảng|tầm|hơn)\s+(\d+(?:[\.,]\d+)?)\s*(triệu|tr|củ)/i;
    const singleMatch = message.match(singleRegex);
    
    if (!singleMatch) return { priceCondition: null, cleanMessage: message };
    
    const condition = singleMatch[1]!.toLowerCase();
    const priceNum = parseFloat(singleMatch[2]!.replace(',', '.')); 
    const priceValue = priceNum * 1000000; 

    let priceCondition: any = null;
    if (condition === 'trên' || condition === 'hơn') {
        priceCondition = { gte: priceValue };
    } else if (condition === 'dưới') {
        priceCondition = { lte: priceValue };
    } else if (condition === 'khoảng' || condition === 'tầm') {
        priceCondition = { gte: priceValue - 2000000, lte: priceValue + 2000000 };
    }

    const cleanMessage = message.replace(singleMatch[0], '');

    return { priceCondition, cleanMessage };
};

const fetchProductContext = async (userMessage: string): Promise<string> => {
    // 1. Tách điều kiện giá và lấy câu nói đã xóa cụm giá
    const { priceCondition, cleanMessage } = parsePriceCondition(userMessage);

    // 2. Tách từ khóa từ câu đã được làm sạch
    const keywords = extractKeywords(cleanMessage);

    const whereClause: any = {
        status: 'available',
    };

    // 3. TẠO VÀ GÁN orConditions vào whereClause (Lỗi của bạn nằm ở việc thiếu gán giá trị này)
    if (keywords.length > 0) {
        const orConditions = keywords.flatMap(kw => [
            { name: { contains: kw, mode: 'insensitive' as const } },
            { description: { contains: kw, mode: 'insensitive' as const } },
            { brand: { name: { contains: kw, mode: 'insensitive' as const } } },
            { category: { name: { contains: kw, mode: 'insensitive' as const } } },
        ]);
        whereClause.OR = orConditions; 
    }

    // 4. Gán điều kiện lọc giá (nếu có)
    if (priceCondition) {
        whereClause.product_variants = {
            some: {
                is_active: true,
                price: priceCondition 
            }
        };
    }

    const products = await prisma.products.findMany({
        where: whereClause,
        take: 200, 
        select: {
            name: true,
            slug: true,
            description: true,
            specifications: true,
            status: true,
            avg_rating: true,
            total_reviews: true,
            category: {
                select: {
                    name: true,
                    description: true,
                    parent: { select: { name: true } },
                },
            },
            brand: { select: { name: true } },
            product_variants: {
                where: { 
                    is_active: true,
                    // Fix lỗi Typescript/Prisma khi truyền undefined bằng cách dùng Spread Operator
                    ...(priceCondition && { price: priceCondition }) 
                },
                orderBy: { price: 'asc' },
                select: {
                    version: true,
                    color: true,
                    price: true,
                    compare_at_price: true,
                    stock: true,
                },
            },
            reviews: {
                take: 3,
                orderBy: { created_at: 'desc' },
                select: {
                    rating: true,
                    comment: true,
                },
            },
        },
    });

    if (products.length === 0) {
        return `Không tìm thấy sản phẩm nào phù hợp với yêu cầu tìm kiếm.`;
    }

    // ... (phía trên giữ nguyên) ...
    
    const contextLines = products.map((p) => {
        // LỚP PHÒNG NGỰ JS: Lọc lại một lần nữa bằng code để đảm bảo chuẩn 100%
        const validVariants = p.product_variants.filter(v => {
            if (!priceCondition) return true; // Không hỏi giá thì lấy hết
            const price = Number(v.price);
            if (priceCondition.gte && price < priceCondition.gte) return false;
            if (priceCondition.lte && price > priceCondition.lte) return false;
            return true;
        });

        // NẾU KHÔNG CÓ PHIÊN BẢN NÀO ĐÚNG GIÁ -> BỎ QUA TOÀN BỘ SẢN PHẨM NÀY
        if (validVariants.length === 0) return null;

        const categoryPath = p.category.parent
            ? `${p.category.parent.name} > ${p.category.name}`
            : p.category.name;

        const specs = p.specifications
            ? JSON.stringify(p.specifications).slice(0, 250)
            : 'Không có';

        // Render variants từ validVariants (đã lọc sạch)
        const variantLines = validVariants.map((v) => {
            const parts: string[] = [];
            if (v.version) parts.push(`Phiên bản: ${v.version}`);
            if (v.color) parts.push(`Màu: ${v.color}`);
            parts.push(`Giá: ${Number(v.price).toLocaleString('vi-VN')} VNĐ`);
            if (v.compare_at_price) {
                parts.push(`(Giá gốc: ${Number(v.compare_at_price).toLocaleString('vi-VN')} VNĐ)`);
            }
            parts.push(v.stock > 0 ? `Còn ${v.stock} sp` : 'Hết hàng');
            return '    • ' + parts.join(' | ');
        }).join('\n');

        const reviewLines = p.reviews
            .filter((r) => r.comment)
            .map((r) => `    ★${r.rating} — "${r.comment}"`)
            .join('\n');

        return [
            `• Tên: ${p.name}`,
            `  Thương hiệu: ${p.brand.name}`,
            `  Danh mục: ${categoryPath}`,
            `  Đánh giá: ${Number(p.avg_rating).toFixed(1)}/5 (${p.total_reviews} lượt)`,
            `  Mô tả: ${p.description ? p.description.slice(0, 200) + '...' : 'Không có'}`,
            `  Thông số kỹ thuật: ${specs}`,
            variantLines ? `  Phiên bản & Giá:\n${variantLines}` : '  (Chưa có phiên bản)',
            reviewLines ? `  Nhận xét khách hàng:\n${reviewLines}` : '',
        ].filter(Boolean).join('\n');
    }).filter(Boolean); // Lọc bỏ tất cả các sản phẩm null (không thỏa mãn giá)

    // Nếu list rỗng sau khi lọc qua JS
    if (contextLines.length === 0) {
        return `Không tìm thấy sản phẩm nào phù hợp với yêu cầu tìm kiếm.`;
    }

    return contextLines.join('\n\n---\n');
};

const fetchCategoryTree = async (): Promise<string> => {
    const categories = await prisma.categories.findMany({
        where: { parent_id: null },
        select: {
            name: true,
            description: true,
            children: {
                select: {
                    name: true,
                    description: true,
                },
            },
        },
    });

    return categories.map((c) => {
        const childList = c.children.map((ch) =>
            ch.description ? `${ch.name} (${ch.description})` : ch.name
        ).join(', ');
        const desc = c.description ? ` — ${c.description}` : '';
        return childList ? `${c.name}${desc}: ${childList}` : `${c.name}${desc}`;
    }).join('\n');
};

const fetchBrands = async (): Promise<string> => {
    const brands = await prisma.brands.findMany({
        select: { name: true },
        orderBy: { name: 'asc' },
    });
    return brands.map((b) => b.name).join(', ');
};

const fetchActiveCoupons = async (): Promise<string> => {
    const now = new Date();
    const coupons = await prisma.coupons.findMany({
        where: {
            is_active: true,
            OR: [
                { expires_at: null },
                { expires_at: { gt: now } },
            ],
        },
        select: {
            code: true,
            discount_type: true,
            discount_value: true,
            min_order_value: true,
            expires_at: true,
        },
    });

    if (coupons.length === 0) return 'Hiện không có mã giảm giá.';

    return coupons.map((c) => {
        const discount = c.discount_type === 'percent'
            ? `Giảm ${Number(c.discount_value)}%`
            : `Giảm ${Number(c.discount_value).toLocaleString('vi-VN')} VNĐ`;
        const minOrder = c.min_order_value
            ? `đơn từ ${Number(c.min_order_value).toLocaleString('vi-VN')} VNĐ`
            : 'không giới hạn đơn tối thiểu';
        const expiry = c.expires_at
            ? `hết hạn ${new Date(c.expires_at).toLocaleDateString('vi-VN')}`
            : 'không giới hạn thời gian';
        return `  • Mã ${c.code}: ${discount}, ${minOrder}, ${expiry}`;
    }).join('\n');
};

const buildSystemPrompt = async (userMessage: string): Promise<string> => {
    const [productContext, categoryTree, brands, coupons] = await Promise.all([
        fetchProductContext(userMessage.toLowerCase()),
        fetchCategoryTree(),
        fetchBrands(),
        fetchActiveCoupons(),
    ]);

    return `Bạn là trợ lý tư vấn mua sắm của cửa hàng ITStore — chuyên bán linh kiện máy tính, laptop, thiết bị gaming và phụ kiện công nghệ.

DANH MỤC SẢN PHẨM ĐANG BÁN:
${categoryTree}

THƯƠNG HIỆU ĐANG BÁN:
${brands}

MÃ GIẢM GIÁ ĐANG HOẠT ĐỘNG:
${coupons}

SẢN PHẨM LIÊN QUAN ĐẾN CÂU HỎI NGƯỜI DÙNG:
${productContext}

NHIỆM VỤ:
- Tư vấn sản phẩm phù hợp với nhu cầu và ngân sách người dùng.
- Giải thích thông số kỹ thuật bằng ngôn ngữ dễ hiểu.
- So sánh các phiên bản/sản phẩm nếu được hỏi.
- Thông báo mã giảm giá nếu phù hợp với đơn hàng.
- Trả lời bằng tiếng Việt, thân thiện, ngắn gọn, có trọng tâm.
- Nếu không có sản phẩm phù hợp, hướng dẫn người dùng dùng chức năng Tìm kiếm trên app.

QUY TẮC TUYỆT ĐỐI — VI PHẠM LÀ SAI:
- Chỉ được nhắc đến sản phẩm, thương hiệu, giá, thông số KỸ THUẬT đã có trong dữ liệu phía trên.
- Nếu không tìm thấy sản phẩm phù hợp, trả lời: "Hiện cửa hàng chưa có sản phẩm phù hợp với yêu cầu này, bạn thử dùng chức năng Tìm kiếm trên app nhé!"
- Tuyệt đối không được tự đặt ra tên sản phẩm, model, thông số, giá không có trong dữ liệu.
- Thương hiệu nào của sản phẩm thì nói đúng thương hiệu đó — không được suy diễn hay đổi tên.
- Không đề cập hay hỏi về bất kỳ thông tin cá nhân nào của người dùng.
- BẮT BUỘC: Không bao giờ được gợi ý, liệt kê hoặc nhắc đến các sản phẩm có mức giá nằm ngoài yêu cầu ngân sách của người dùng. Nếu dữ liệu cung cấp không có sản phẩm nào khớp, hãy báo hết hàng.`;
};

export const chatWithBot = async (
    userMessage: string,
    history: ChatMessage[],
): Promise<string> => {
    const systemPrompt = await buildSystemPrompt(userMessage);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
    ];

    const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content ?? 'Xin lỗi, tôi không thể trả lời lúc này.';
};

export const chatWithBotStream = async (
    userMessage: string,
    history: ChatMessage[],
) => {
    const systemPrompt = await buildSystemPrompt(userMessage);

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage },
    ];

    return groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
    });
};