import time
import requests

# ============================================================
# Setup
# ============================================================

API_BASE = "http://172.18.108.42:8000"


def update_user_location(user_id: int, lat: float, lng: float):
    """呼叫後端 update_user_location"""
    url = f"{API_BASE}/users/{user_id}/location"
    payload = {
        "gps_latitude": lat,
        "gps_longitude": lng,
    }
    r = requests.patch(url, json=payload)
    #r.raise_for_status()


def interpolate(p1, p2, t: float):
    """線性插值 t ∈ [0,1]"""
    lat = p1[0] + (p2[0] - p1[0]) * t
    lng = p1[1] + (p2[1] - p1[1]) * t
    return lat, lng


# ============================================================
# bot1
# ============================================================

bot1_user_id = 1

bot1_start_point = (24.784167214198348, 120.99577201714712)

bot1_path_points = [
    (24.785356096823456, 120.99525138885431),
    (24.786812645274573, 120.99530314180265),
    (24.786812645274573, 120.99678672632142),
]

bot1_total_time = 10        # 秒
bot1_step_interval = 1      # 每秒更新
bot1_total_steps = bot1_total_time // bot1_step_interval


class Bot1:
    def init(self):
        update_user_location(
            bot1_user_id,
            bot1_start_point[0],
            bot1_start_point[1],
        )
        print(
            f"bot1 已初始化至 "
            f"({bot1_start_point[0]:.6f}, {bot1_start_point[1]:.6f})"
        )

    def start(self):
        segments = [
            (bot1_start_point, bot1_path_points[0]),
            (bot1_path_points[0], bot1_path_points[1]),
            (bot1_path_points[1], bot1_path_points[2]),
        ]

        steps_per_segment = bot1_total_steps // len(segments)

        for p_start, p_end in segments:
            for i in range(steps_per_segment):
                t = (i + 1) / steps_per_segment
                lat, lng = interpolate(p_start, p_end, t)

                update_user_location(bot1_user_id, lat, lng)
                print(f"bot1 目前位置：({lat:.6f}, {lng:.6f})")

                time.sleep(bot1_step_interval)

        print("已抵達")


# ============================================================
# bot2
# ============================================================

bot2_user_id = 2
bot2_start_point = (24.784595175064993, 120.99936508730968)


class Bot2:
    def init(self):
        update_user_location(
            bot2_user_id,
            bot2_start_point[0],
            bot2_start_point[1],
        )
        print(
            f"bot2 已初始化至 "
            f"({bot2_start_point[0]:.6f}, {bot2_start_point[1]:.6f})"
        )

# ============================================================
# bot3
# ============================================================

bot3_user_id = 3

bot3_start_point = (24.800832255402224, 120.98208778197302)

bot3_start_path = [
    (24.80244325476999, 120.98320863670124),
    (24.799023389009534, 120.99342086901285),
    (24.79108102292764, 121.00444260762039),
    (24.790374382097554, 121.00450487732749),
    (24.789017620420413, 121.00322834833149),
    (24.7895248741003, 120.99990367661985),
]

bot3_cont_path = [
    (24.788401747118908, 120.99945381701433),
    (24.786832306617892, 120.99684717617372),
]

bot3_total_time_start = 20
bot3_total_time_cont = 12
bot3_step_interval = 1

class Bot3:
    def init(self):
        update_user_location(
            bot3_user_id,
            bot3_start_point[0],
            bot3_start_point[1],
        )
        print(
            f"bot3 已初始化至 "
            f"({bot3_start_point[0]:.6f}, {bot3_start_point[1]:.6f})"
        )

    def _move_along_path(self, start_point, path_points, total_time):
        full_path = [start_point] + path_points
        segments = [
            (full_path[i], full_path[i + 1])
            for i in range(len(full_path) - 1)
        ]

        total_steps = total_time // bot3_step_interval
        steps_per_segment = total_steps // len(segments)

        for p_start, p_end in segments:
            for i in range(steps_per_segment):
                t = (i + 1) / steps_per_segment
                lat, lng = interpolate(p_start, p_end, t)

                update_user_location(bot3_user_id, lat, lng)
                print(f"bot3 目前位置：({lat:.6f}, {lng:.6f})")

                time.sleep(bot3_step_interval)

    def start(self):
        self._move_along_path(
            bot3_start_point,
            bot3_start_path,
            bot3_total_time_start,
        )
        print("bot3 start 路線已抵達")

    def cont(self):
        self._move_along_path(
            bot3_start_path[-1],
            bot3_cont_path,
            bot3_total_time_cont,
        )
        print("bot3 cont 路線已抵達")


# ============================================================
# CLI 入口
# ============================================================

if __name__ == "__main__":
    bot1 = Bot1()
    bot2 = Bot2()
    bot3 = Bot3()

    while True:
        cmd = input(">>> ").strip()

        if cmd == "bot1.init":
            bot1.init()
        elif cmd == "bot1.start":
            bot1.start()

        elif cmd == "bot2.init":
            bot2.init()

        elif cmd == "bot3.init":
            bot3.init()
        elif cmd == "bot3.start":
            bot3.start()
        elif cmd == "bot3.cont":
            bot3.cont()

        elif cmd in {"exit", "quit"}:
            break
