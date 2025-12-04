// api.js
import axios from "axios";

// 用 ifconfig 找到你自己的 IP：ex, ip addr show
export const API_BASE = "http://192.168.0.100:8000";

const client = axios.create({
    baseURL: API_BASE,
});

// Provider 發佈剩食
export function createFood({ title, total_quantity }) {
    return client.post("/foods", {
        title,
        total_quantity,
        // 之後要接 GPS 的時候，可以在這裡再多傳 lat/lng、time_limit、distance_limit
    });
}

// Receiver 取得所有剩食（之後改成 /foods/nearby）
export function getFoods() {
    return client.get("/foods");
}

// Receiver 預約剩食
export function bookFood({ id, amount }) {
    return client.post(`/foods/${id}/book`, null, {
        params: { amount },
    });
}
