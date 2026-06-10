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

const fetchProductContext = async (userMessage: string): Promise<string> => {
    const keywords = extractKeywords(userMessage);

    const orConditions = keywords.flatMap(kw => [
        { name: { contains: kw, mode: 'insensitive' as const } },
        { description: { contains: kw, mode: 'insensitive' as const } },
        { brand: { name: { contains: kw, mode: 'insensitive' as const } } },
        { category: { name: { contains: kw, mode: 'insensitive' as const } } },
    ]);

    const products = await prisma.products.findMany({
        where: {
            status: 'available',
            OR: orConditions,
        },
        take: 5,
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
                where: { is_active: true },
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
        return `Không tìm thấy sản phẩm nào khớp với từ khoá: ${keywords.join(', ')}.`;
    }

    return products.map((p) => {
        const categoryPath = p.category.parent
            ? `${p.category.parent.name} > ${p.category.name}`
            : p.category.name;

        const specs = p.specifications
            ? JSON.stringify(p.specifications).slice(0, 250)
            : 'Không có';

        const variantLines = p.product_variants.map((v) => {
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
    }).join('\n\n---\n');
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
- Không đề cập hay hỏi về bất kỳ thông tin cá nhân nào của người dùng.`;
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