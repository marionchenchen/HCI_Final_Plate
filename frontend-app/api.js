// api.js

const BASE_URL = 'http://172.20.10.4:8000'; 

// 假設類型
interface ItemPayload {
    item: string;
    number_online: number;
    number_onsite: number;
}

interface PicturePayload {
    picture: string; // Base64 String
}

interface PostCreatePayload {
    // user_id: number;
    address: string;
    tag: string;
    note: string;
    gps_latitude: number;
    gps_longitude: number;
    time_restriction: number;
    distance_restriction: number;
    items: ItemPayload[];
    pictures: PicturePayload[];
}

// 發布貼文
export async function publishFoodPost(payload: PostCreatePayload) {
    const response = await fetch(`${BASE_URL}/posts/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            throw new Error(`API 請求失敗 (HTTP ${response.status}): ${response.statusText}`);
        }
        
        if (response.status === 422 && errorData.detail) {
            const validationErrors = errorData.detail.map((err: any) => 
                `欄位: ${err.loc.slice(1).join('.')} - 錯誤: ${err.msg}`
            ).join('; ');
            
            throw new Error(`數據驗證失敗 (422)。請檢查欄位格式: ${validationErrors}`);
        }
        
        const errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData) || '未知伺服器錯誤';
        throw new Error(`API 請求失敗 (HTTP ${response.status}): ${errorMessage}`);
    }

    return response.json();
}

// 取得貼文
export async function fetchPosts() {
    try {
        const response = await fetch(`${BASE_URL}/posts/`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data; 
        
    } catch (error) {
        console.error("Error fetching posts:", error);
        throw error; 
    }
}

// 取得特定貼文的預約資訊
export async function fetchReservationsByFood(foodId) {
    const response = await fetch(`${BASE_URL}/reservations/food/${foodId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch reservations');
    }
    return response.json();
}