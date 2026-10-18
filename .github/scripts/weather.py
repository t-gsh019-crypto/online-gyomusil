# 기상청 단기예보(KMA_KEY)로 오늘 시간별 날씨를 weather.json에 저장. 키가 없거나 실패하면 Open-Meteo로 대신.
import json, math, os, re, sys, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
src = open("shared/school.js", encoding="utf-8").read()
LAT = float(re.search(r"lat:\s*([0-9.]+)", src).group(1))
LON = float(re.search(r"lon:\s*([0-9.]+)", src).group(1))


def grid(lat, lon):
    # 위도·경도 → 기상청 격자(nx, ny) (기상청 안내 문서의 변환식)
    RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO = 6371.00877, 5.0, 30.0, 60.0, 126.0, 38.0, 43, 136
    D = math.pi / 180.0
    re_ = RE / GRID
    s1, s2, olon, olat = SLAT1 * D, SLAT2 * D, OLON * D, OLAT * D
    sn = math.log(math.cos(s1) / math.cos(s2)) / math.log(math.tan(math.pi * 0.25 + s2 * 0.5) / math.tan(math.pi * 0.25 + s1 * 0.5))
    sf = math.tan(math.pi * 0.25 + s1 * 0.5) ** sn * math.cos(s1) / sn
    ro = re_ * sf / math.tan(math.pi * 0.25 + olat * 0.5) ** sn
    ra = re_ * sf / math.tan(math.pi * 0.25 + lat * D * 0.5) ** sn
    th = lon * D - olon
    th = (th + 2 * math.pi) % (2 * math.pi)
    th = th - 2 * math.pi if th > math.pi else th
    th *= sn
    return int(ra * math.sin(th) + XO + 0.5), int(ro - ra * math.cos(th) + YO + 0.5)


def get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def kma(key):
    nx, ny = grid(LAT, LON)
    now = datetime.now(KST)
    bases = [2, 5, 8, 11, 14, 17, 20, 23]

    def latest(t):  # 발표 후 15분이 지난 가장 최근 발표 시각
        t = t - timedelta(minutes=15)
        for h in reversed(bases):
            if t.hour >= h:
                return t.strftime("%Y%m%d"), f"{h:02d}00"
        y = t - timedelta(days=1)
        return y.strftime("%Y%m%d"), "2300"

    today = now.strftime("%Y%m%d")
    early = (today, "0200") if now >= now.replace(hour=2, minute=15) else latest(now)
    rows = {}
    for d, b in dict.fromkeys([early, latest(now)]):  # 이른 발표로 하루를 채우고 최신 발표로 덮어씀
        q = urllib.parse.urlencode({"serviceKey": key, "pageNo": 1, "numOfRows": 1000, "dataType": "JSON", "base_date": d, "base_time": b, "nx": nx, "ny": ny})
        j = get("https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?" + q)
        if j["response"]["header"]["resultCode"] != "00":
            raise RuntimeError(j["response"]["header"]["resultMsg"])
        for it in j["response"]["body"]["items"]["item"]:
            if it["category"] in ("TMP", "SKY", "PTY", "POP"):
                rows.setdefault(it["fcstDate"] + it["fcstTime"], {})[it["category"]] = it["fcstValue"]
    out = {"time": [], "temperature_2m": [], "weather_code": [], "precipitation_probability": []}
    for k in sorted(rows):
        r = rows[k]
        if not {"TMP", "SKY", "PTY"} <= r.keys():
            continue
        pty, sky = int(r["PTY"]), int(r["SKY"])
        code = 61 if pty in (1, 2, 4) else 71 if pty == 3 else {1: 0, 3: 2, 4: 3}.get(sky, 3)
        out["time"].append(f"{k[0:4]}-{k[4:6]}-{k[6:8]}T{k[8:10]}:00")
        out["temperature_2m"].append(float(r["TMP"]))
        out["weather_code"].append(code)
        out["precipitation_probability"].append(int(r.get("POP", 0)))
    if not out["time"]:
        raise RuntimeError("예보가 비어 있음")
    return out, "기상청"


def openmeteo():
    j = get(f"https://api.open-meteo.com/v1/forecast?latitude={LAT}&longitude={LON}&hourly=temperature_2m,weather_code,precipitation_probability&timezone=Asia%2FSeoul&forecast_days=2")
    return j["hourly"], "Open-Meteo"


try:
    key = os.environ.get("KMA_KEY", "").strip()
    if "%" in key:  # Encoding 키를 넣었어도 되도록 한 번 풀어 줌
        key = urllib.parse.unquote(key)
    if not key:
        raise RuntimeError("KMA_KEY 없음")
    hourly, source = kma(key)
except Exception as e:
    print("기상청 실패, Open-Meteo로 대신:", e, file=sys.stderr)
    hourly, source = openmeteo()

json.dump({"hourly": hourly, "lat": LAT, "lon": LON, "source": source, "updated": datetime.now(timezone.utc).isoformat()}, open("weather.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(source, len(hourly["time"]), "칸")
