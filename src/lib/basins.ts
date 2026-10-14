import rawBasins from "../../content/major-basins.json";
import { geoContains } from "d3-geo";
import type { GeoPermissibleObjects } from "d3-geo";

export type ContinentId = "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania";
export type Basin = {
  id: string;
  name: string;
  continent: ContinentId;
  areaKm2: number;
  center: [longitude: number, latitude: number];
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  label: string;
};

export const continentNames: Record<ContinentId, string> = {
  africa: "非洲",
  asia: "亚洲",
  europe: "欧洲",
  "north-america": "北美洲",
  "south-america": "南美洲",
  oceania: "大洋洲",
};

// Familiar Chinese names are editorial display labels; GRDC's English names
// and stable MRBID values remain available for search and source checking.
const chineseNames: Record<string, string> = {
  "3203": "亚马孙河流域", "1209": "刚果河流域", "1229": "尼罗河流域",
  "4219": "密西西比河流域", "2108": "鄂毕河流域", "3238": "巴拉那河流域",
  "2117": "叶尼塞河流域", "1902": "乍得湖流域", "2106": "勒拿河流域",
  "2401": "黑龙江流域", "1228": "尼日尔河流域", "4123": "马更些河流域",
  "2433": "长江流域", "2914": "塔里木河流域", "6903": "伏尔加河流域",
  "1325": "赞比西河流域", "2902": "咸海流域", "5902": "艾尔湖流域",
  "4125": "纳尔逊河流域", "5309": "墨累河流域", "4238": "圣劳伦斯河流域",
  "2306": "恒河流域", "1234": "奥兰治河流域", "2434": "黄河流域",
  "3234": "奥里诺科河流域", "2320": "底格里斯—幼发拉底河流域",
  "2309": "印度河流域", "4435": "育空河流域", "1308": "朱巴河流域",
  "6202": "多瑙河流域", "2421": "湄公河流域", "3247": "托坎廷斯河流域",
  "1913": "奥卡万戈河流域", "4231": "格兰德河流域", "4406": "哥伦比亚河流域",
  "4405": "科罗拉多河流域", "3245": "圣弗朗西斯科河流域",
  "2302": "布拉马普特拉河流域", "6204": "第聂伯河流域",
  "1242": "塞内加尔河流域", "6206": "顿河流域",
  "3243": "拉普拉塔河流域", "2310": "伊洛瓦底江流域",
  "2910": "巴尔喀什湖流域", "1246": "沃尔特河流域",
  "1309": "林波波河流域", "2437": "珠江流域",
  "2319": "萨尔温江流域", "3227": "马格达莱纳河流域",
  "2307": "戈达瓦里河流域", "2312": "克里希纳河流域",
  "2436": "海河流域", "2417": "辽河流域", "6259": "维斯瓦河流域",
  "2403": "湄南河流域", "5432": "塞皮克河流域",
  "5434": "弗莱河流域",
  "4240": "圣胡安河流域（中美洲）", "3248": "乌拉圭河流域",
  "3219": "埃塞奎博河流域", "3214": "库兰太因河流域",
  "5417": "京那巴当岸河流域",
  "5414": "巴当哈里河流域", "5419": "因陀罗吉里—关丹河流域",
  "5415": "卡普阿斯河流域", "5423": "曼伯拉莫河流域", "6241": "波河流域",
  "6243": "罗讷河流域", "6242": "莱茵河流域", "2303": "高韦里河流域", "2420": "湄克隆河流域",
  "2426": "红河流域", "5407": "戴利河流域", "4224": "帕努科河流域",
  "4225": "帕帕洛阿潘河流域", "4226": "帕图卡河流域", "4429": "苏奇亚特河流域",
  "4205": "开普菲尔河流域",
  "3242": "里贝拉—伊瓜佩河流域", "4249": "乌苏马辛塔河流域",
  "1233": "奥果韦河流域", "5422": "马哈坎河流域", "5418": "哥洛河流域",
  "2411": "淮河流域", "2422": "闽江流域", "2425": "钱塘江流域",
  "2430": "图们江流域", "2432": "鸭绿江流域",
  "4211": "特拉华河流域", "4214": "哈德逊河流域", "4220": "莫比尔河流域",
  "4223": "纽埃西斯河流域", "4243": "萨凡纳河流域", "4410": "弗雷泽河流域",
  "4421": "萨克拉门托河流域", "4423": "圣华金河流域", "4901": "大盐湖流域",
  "6106": "奥涅加河流域", "6107": "伯朝拉河流域", "6205": "德涅斯特河流域",
  "6208": "杜罗河流域", "6210": "埃布罗河流域", "6211": "易北河流域",
  "6212": "加龙河流域", "6223": "库班河流域", "6226": "卢瓦尔河流域",
  "6228": "默兹河流域", "6236": "奥得河流域", "6244": "萨卡里亚河流域",
  "6246": "塞纳河流域", "6247": "塞文河流域", "6251": "斯特鲁马河流域",
  "6252": "塔霍河流域", "6253": "泰晤士河流域", "6258": "瓦尔达尔河流域",
  "6260": "威悉河流域",
};

export const basins: Basin[] = (rawBasins as Omit<Basin, "label">[]).map((basin) => ({
  ...basin,
  label: chineseNames[basin.id] ?? basin.name,
}));
export const basinById = new Map(basins.map((basin) => [basin.id, basin]));

export function findBasinAt(longitude: number, latitude: number): Basin | null {
  const point: [number, number] = [longitude, latitude];
  return basins.find((basin) =>
    geoContains({ type: "Feature", properties: {}, geometry: basin.geometry } as GeoPermissibleObjects, point),
  ) ?? null;
}
