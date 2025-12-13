// api.js

const BASE_URL = 'http://172.18.14.64:8000'; 

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

// 取得單一貼文
export const getPostById = async (foodId) => {
    try {
        const response = await fetch(`${BASE_URL}/posts/${foodId}`);
        if (!response.ok) {
            throw new Error('無法取得貼文資料');
        }
        return await response.json();
    } catch (error) {
        console.error('getPostById Error:', error);
        throw error;
    }
};

// 編輯貼文
export const updatePost = async (foodId, postData) => {
    try {
        const response = await fetch(`${BASE_URL}/posts/${foodId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || '更新貼文失敗');
        }

        return await response.json();
    } catch (error) {
        console.error('updatePost Error:', error);
        throw error;
    }
};

// 取得特定貼文的預約資訊
export async function fetchReservationsByFood(foodId) {
    const response = await fetch(`${BASE_URL}/reservations/food/${foodId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch reservations');
    }
    return response.json();
}

// 創建預約
export const createReservation = async (reservationData) => {
    try {
        const response = await fetch(`${BASE_URL}/reservations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(reservationData),
        });

        if (!response.ok) {
            // 🚨 修正點：嘗試讀取錯誤細節，如果失敗，則提供更通用的訊息
            const errorData = await response.json().catch(() => ({ detail: '無法解析後端錯誤訊息' }));

            let errorMessage = '預約失敗，請檢查輸入數量。';

            // 檢查 FastAPI 預設的錯誤格式或我們期望的 detail
            if (errorData.detail) {
                // 如果 detail 是一個陣列 (例如 Pydantic 驗證錯誤)，則將其轉換為字串
                if (Array.isArray(errorData.detail)) {
                    // 🚨 這是最常見的 FastAPI 驗證錯誤格式，需要取出 msg
                    errorMessage = errorData.detail.map(err => err.msg || JSON.stringify(err)).join('; ');
                } else if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else {
                    errorMessage = JSON.stringify(errorData.detail);
                }
            }
            
            throw new Error(errorMessage);
        }

        return await response.json(); 
    } catch (error) {
        console.error('createReservation Error:', error);
        throw error;
    }
};