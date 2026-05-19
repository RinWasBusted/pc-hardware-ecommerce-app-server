import 'dotenv/config';

const GHN_API_URL = 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee';
const GHN_TOKEN = process.env.GHN_TOKEN || '';
const GHN_SHOP_ID = process.env.GHN_SHOP_ID || '';
const SHOP_DISTRICT_ID = process.env.SHOP_DISTRICT_ID || '';
const SHOP_WARD_CODE = process.env.SHOP_WARD_CODE || '';

const getShipmentFee = async (to_district_id: number, to_ward_code: string) => {
    try {
        console.log('GHN TOKEN:', GHN_TOKEN);
        console.log('GHN SHOP ID:', GHN_SHOP_ID);
        console.log('SHOP DISTRICT ID:', SHOP_DISTRICT_ID);
        console.log('SHOP WARD CODE:', SHOP_WARD_CODE);
        console.log('To District ID:', to_district_id);
        console.log('To Ward Code:', to_ward_code);
        const response = await fetch(GHN_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID,
            },
            body: JSON.stringify({
                service_type_id: 2, // Dịch vụ giao hàng nhanh
                from_district_id: Number(SHOP_DISTRICT_ID),
                from_ward_code: SHOP_WARD_CODE,
                to_district_id: Number(to_district_id),
                to_ward_code: to_ward_code,
                weight: 1000, // Cân nặng mặc định (1kg)
                length: 20, // Chiều dài mặc định (20cm)
                width: 20, // Chiều rộng mặc định (20cm)
                height: 20, // Chiều cao mặc định (20cm)
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Lỗi từ GHN API: ${errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const total = Number(data?.data?.total);
        if (Number.isNaN(total)) {
            throw new Error('GHN không trả về phí vận chuyển hợp lệ');
        }

        return total; // Trả về phí vận chuyển
    } catch (error: any) {
        console.error('Error calculating shipment fee:', error);
        throw new Error(`Không thể tính phí vận chuyển: ${error.message || 'Unknown error'}`);
    }
};

export { getShipmentFee };
