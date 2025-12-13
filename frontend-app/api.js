// api.js

const BASE_URL = 'http://172.18.14.66:8000'; 

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

// 取得特定使用者的預約 food_id
export async function fetchFoodIdByUser(userId) {
    const response = await fetch(`${BASE_URL}/reservations/user/${userId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch reservation');
    }
    const reservation = await response.json();
    console.log("Reservation data from API:", reservation);
    return reservation.length > 0 ? reservation[0].food_id : null;
}

export async function fetchReserveInfoByUser(userId) {
    const response = await fetch(`${BASE_URL}/reservations/user/${userId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch reservation');
    }

    const data = await response.json();
    console.log("Reservation data from API:", data);

    if (data.length === 0 || data[0].reservations.length === 0) {
        return null;
    }

    const reservation = data[0].reservations[0];

    return {
        reserve_at: reservation.reserve_at,
        number_book: reservation.number_book,
    };
}

export async function fetchReservationsByUserAndFood(userId, foodId) {
    const response = await fetch(`${BASE_URL}/reservations/user/${userId}`);
    if (!response.ok) {
        throw new Error('Failed to fetch reservations by user');
    }

    const data = await response.json();
    console.log("Reservation data from API:", data);

    if (data.length === 0) return [];

    // 過濾出指定 food_id 的 reservations
    const filteredReservations = data.flatMap(userGroup =>
        userGroup.reservations
            .filter(r => r.food_id === foodId)
            .map(r => ({
                user_id: userGroup.user_id,
                reservation_id: r.reservation_id,
                item_name: r.item_name,
                number_book: r.number_book,
                reserve_at: r.reserve_at,
                gps_latitude: r.gps_latitude,
                gps_longitude: r.gps_longitude,
            }))
    );

    return filteredReservations;
}






