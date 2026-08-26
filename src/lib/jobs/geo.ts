/**
 * Canonical geography resolver for job postings.
 *
 * Providers ship wildly inconsistent location data — "San Francisco",
 * "CA", "Remote - US", "D.C.", "Bengaluru, Karnataka" — often stuffed into
 * `location_country`. Every consumer (matching, feed ranking, filters, admin
 * analytics) must agree on ONE answer, so all country/region resolution goes
 * through this module.
 */

export type Region =
  | "india"
  | "north-america"
  | "europe"
  | "asia"
  | "oceania"
  | "latin-america"
  | "middle-east"
  | "africa"
  | "global"
  | "unknown";

export type Geo = {
  /** ISO-3166 alpha-2, uppercase. Null when unresolved. */
  countryCode: string | null;
  /** Human country label ("India", "United States"). */
  country: string | null;
  region: Region;
  /** True when the text says worldwide/anywhere with no country hint. */
  worldwide: boolean;
};

export const REGION_LABELS: Record<Region, string> = {
  india: "India",
  "north-america": "North America",
  europe: "Europe",
  asia: "Asia",
  oceania: "Australia / Oceania",
  "latin-america": "Latin America",
  "middle-east": "Middle East",
  africa: "Africa",
  global: "Global / Remote",
  unknown: "Unknown",
};

export const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  GB: "United Kingdom",
  IE: "Ireland",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  ES: "Spain",
  PT: "Portugal",
  IT: "Italy",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  CZ: "Czechia",
  RO: "Romania",
  HU: "Hungary",
  GR: "Greece",
  UA: "Ukraine",
  EE: "Estonia",
  LT: "Lithuania",
  LV: "Latvia",
  BG: "Bulgaria",
  HR: "Croatia",
  RS: "Serbia",
  SG: "Singapore",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  HK: "Hong Kong",
  TW: "Taiwan",
  MY: "Malaysia",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  NP: "Nepal",
  AU: "Australia",
  NZ: "New Zealand",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  QA: "Qatar",
  IL: "Israel",
  TR: "Turkey",
  EG: "Egypt",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  MA: "Morocco",
  BR: "Brazil",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  UY: "Uruguay",
  CR: "Costa Rica",
};

export const COUNTRY_REGION: Record<string, Region> = {
  IN: "india",
  US: "north-america",
  CA: "north-america",
  MX: "north-america",
  GB: "europe",
  IE: "europe",
  DE: "europe",
  FR: "europe",
  NL: "europe",
  ES: "europe",
  PT: "europe",
  IT: "europe",
  CH: "europe",
  AT: "europe",
  BE: "europe",
  SE: "europe",
  NO: "europe",
  DK: "europe",
  FI: "europe",
  PL: "europe",
  CZ: "europe",
  RO: "europe",
  HU: "europe",
  GR: "europe",
  UA: "europe",
  EE: "europe",
  LT: "europe",
  LV: "europe",
  BG: "europe",
  HR: "europe",
  RS: "europe",
  SG: "asia",
  JP: "asia",
  KR: "asia",
  CN: "asia",
  HK: "asia",
  TW: "asia",
  MY: "asia",
  ID: "asia",
  TH: "asia",
  VN: "asia",
  PH: "asia",
  PK: "asia",
  BD: "asia",
  LK: "asia",
  NP: "asia",
  AU: "oceania",
  NZ: "oceania",
  AE: "middle-east",
  SA: "middle-east",
  QA: "middle-east",
  IL: "middle-east",
  TR: "middle-east",
  EG: "africa",
  ZA: "africa",
  NG: "africa",
  KE: "africa",
  MA: "africa",
  BR: "latin-america",
  AR: "latin-america",
  CL: "latin-america",
  CO: "latin-america",
  PE: "latin-america",
  UY: "latin-america",
  CR: "latin-america",
};

/** Indian cities/states/UTs — also used for the "Indian city" classification. */
export const INDIA_CITIES = [
  "bengaluru", "bangalore", "blr", "mumbai", "bombay", "navi mumbai", "thane", "delhi",
  "new delhi", "ncr", "noida", "greater noida", "gurgaon", "gurugram", "faridabad",
  "ghaziabad", "pune", "pimpri", "chinchwad", "hyderabad", "secunderabad", "chennai",
  "madras", "kolkata", "calcutta", "ahmedabad", "gandhinagar", "jaipur", "indore",
  "bhopal", "surat", "vadodara", "baroda", "rajkot", "kochi", "cochin", "ernakulam",
  "trivandrum", "thiruvananthapuram", "coimbatore", "madurai", "mysore", "mysuru",
  "chandigarh", "mohali", "panchkula", "lucknow", "kanpur", "nagpur", "nashik",
  "aurangabad", "visakhapatnam", "vizag", "vijayawada", "bhubaneswar", "cuttack",
  "guwahati", "dehradun", "raipur", "ranchi", "patna", "varanasi", "agra", "amritsar",
  "ludhiana", "jodhpur", "udaipur", "kota", "goa", "panaji", "trichy", "tiruchirappalli",
  "salem", "hubli", "belgaum", "mangalore", "mangaluru", "jamshedpur", "siliguri",
  "howrah", "durgapur", "anand", "nadiad", "navsari", "jamnagar", "bhavnagar", "hosur",
  "warangal", "tirupati", "puducherry", "pondicherry", "shimla", "jammu", "srinagar",
];

const INDIA_STATES = [
  "gujarat", "maharashtra", "karnataka", "tamil nadu", "telangana", "kerala",
  "rajasthan", "punjab", "haryana", "west bengal", "uttar pradesh", "madhya pradesh",
  "andhra pradesh", "odisha", "orissa", "bihar", "jharkhand", "assam", "chhattisgarh",
  "uttarakhand", "himachal pradesh", "goa", "tripura", "manipur", "meghalaya",
];

const US_STATE_NAMES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
  "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
  "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west virginia", "wisconsin", "wyoming",
  "district of columbia", "washington dc", "puerto rico",
];

const US_STATE_ABBR = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "de", "fl", "ga", "hi", "id", "il", "in",
  "ia", "ks", "ky", "la", "me", "md", "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv",
  "nh", "nj", "nm", "ny", "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn",
  "tx", "ut", "vt", "va", "wa", "wv", "wi", "wy", "dc", "pr",
];

const US_CITIES = [
  "san francisco", "sf bay area", "bay area", "silicon valley", "new york city", "nyc",
  "brooklyn", "manhattan", "seattle", "austin", "boston", "chicago", "los angeles",
  "san diego", "san jose", "palo alto", "mountain view", "sunnyvale", "santa clara",
  "cupertino", "redmond", "bellevue", "denver", "boulder", "atlanta", "dallas",
  "houston", "phoenix", "portland", "philadelphia", "pittsburgh", "miami", "orlando",
  "tampa", "minneapolis", "detroit", "nashville", "charlotte", "raleigh", "durham",
  "columbus", "cincinnati", "cleveland", "kansas city", "st louis", "salt lake city",
  "las vegas", "sacramento", "irvine", "oakland", "arlington", "alexandria", "reston",
  "mclean", "ann arbor", "madison", "boise", "omaha", "richmond", "baltimore",
  "washington d c", "d c",
];

/** city/region → ISO country, for non-India non-US hubs. */
const CITY_COUNTRY: Array<[string[], string]> = [
  [["toronto", "vancouver", "montreal", "ottawa", "calgary", "waterloo", "mississauga", "ontario", "quebec", "british columbia", "alberta"], "CA"],
  [["london", "manchester", "birmingham", "leeds", "bristol", "edinburgh", "glasgow", "cambridge", "oxford", "reading", "england", "scotland", "wales", "northern ireland", "great britain"], "GB"],
  [["dublin", "cork", "galway"], "IE"],
  [["berlin", "munich", "muenchen", "hamburg", "frankfurt", "cologne", "koeln", "stuttgart", "dusseldorf", "leipzig", "deutschland"], "DE"],
  [["paris", "lyon", "toulouse", "marseille", "bordeaux", "nantes", "lille"], "FR"],
  [["amsterdam", "rotterdam", "utrecht", "eindhoven", "the hague", "holland", "netherlands"], "NL"],
  [["madrid", "barcelona", "valencia", "seville", "malaga"], "ES"],
  [["lisbon", "lisboa", "porto"], "PT"],
  [["milan", "milano", "rome", "roma", "turin", "torino", "bologna"], "IT"],
  [["zurich", "zuerich", "geneva", "lausanne", "basel"], "CH"],
  [["vienna", "wien", "graz"], "AT"],
  [["brussels", "antwerp", "ghent"], "BE"],
  [["stockholm", "gothenburg", "malmo"], "SE"],
  [["oslo", "bergen"], "NO"],
  [["copenhagen", "aarhus"], "DK"],
  [["helsinki", "espoo", "tampere"], "FI"],
  [["warsaw", "krakow", "wroclaw", "gdansk", "poznan"], "PL"],
  [["prague", "praha", "brno", "czech republic"], "CZ"],
  [["bucharest", "cluj", "timisoara"], "RO"],
  [["budapest", "debrecen"], "HU"],
  [["athens", "thessaloniki"], "GR"],
  [["kyiv", "kiev", "lviv"], "UA"],
  [["tallinn"], "EE"],
  [["vilnius", "kaunas"], "LT"],
  [["riga"], "LV"],
  [["sofia"], "BG"],
  [["zagreb"], "HR"],
  [["belgrade", "novi sad"], "RS"],
  [["singapore"], "SG"],
  [["tokyo", "osaka", "kyoto", "yokohama", "nagoya", "fukuoka"], "JP"],
  [["seoul", "busan", "korea"], "KR"],
  [["beijing", "shanghai", "shenzhen", "guangzhou", "hangzhou"], "CN"],
  [["hong kong", "kowloon"], "HK"],
  [["taipei", "taiwan", "hsinchu"], "TW"],
  [["kuala lumpur", "penang", "cyberjaya", "johor"], "MY"],
  [["jakarta", "bandung", "surabaya", "bali"], "ID"],
  [["bangkok", "chiang mai", "phuket"], "TH"],
  [["ho chi minh", "hanoi", "saigon", "da nang"], "VN"],
  [["manila", "cebu", "makati", "taguig", "quezon city"], "PH"],
  [["karachi", "lahore", "islamabad"], "PK"],
  [["dhaka", "chittagong"], "BD"],
  [["colombo"], "LK"],
  [["kathmandu"], "NP"],
  [["sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "new south wales", "victoria australia", "queensland"], "AU"],
  [["auckland", "wellington", "christchurch"], "NZ"],
  [["dubai", "abu dhabi", "sharjah", "uae", "u a e"], "AE"],
  [["riyadh", "jeddah", "dammam"], "SA"],
  [["doha"], "QA"],
  [["tel aviv", "jerusalem", "haifa", "herzliya"], "IL"],
  [["istanbul", "ankara", "izmir"], "TR"],
  [["cairo", "alexandria egypt", "giza"], "EG"],
  [["johannesburg", "cape town", "durban", "pretoria"], "ZA"],
  [["lagos", "abuja"], "NG"],
  [["nairobi", "mombasa"], "KE"],
  [["casablanca", "rabat", "marrakech"], "MA"],
  [["sao paulo", "rio de janeiro", "brasilia", "belo horizonte", "curitiba", "brasil"], "BR"],
  [["buenos aires", "cordoba argentina", "rosario"], "AR"],
  [["santiago"], "CL"],
  [["bogota", "medellin", "cali"], "CO"],
  [["lima"], "PE"],
  [["montevideo"], "UY"],
  [["san jose costa rica", "heredia"], "CR"],
  [["mexico city", "guadalajara", "monterrey", "cdmx"], "MX"],
];

/** Explicit country aliases, checked before city lists. */
const COUNTRY_ALIASES: Array<[string[], string]> = [
  [["india", "bharat", "in india", "india remote", "remote india"], "IN"],
  [["united states", "united states of america", "usa", "u s a", "us", "u s", "america", "united states minor outlying islands"], "US"],
  [["canada"], "CA"],
  [["mexico"], "MX"],
  [["united kingdom", "uk", "u k", "britain"], "GB"],
  [["ireland"], "IE"],
  [["germany"], "DE"],
  [["france"], "FR"],
  [["netherlands"], "NL"],
  [["spain"], "ES"],
  [["portugal"], "PT"],
  [["italy"], "IT"],
  [["switzerland"], "CH"],
  [["austria"], "AT"],
  [["belgium"], "BE"],
  [["sweden"], "SE"],
  [["norway"], "NO"],
  [["denmark"], "DK"],
  [["finland"], "FI"],
  [["poland"], "PL"],
  [["czechia"], "CZ"],
  [["romania"], "RO"],
  [["hungary"], "HU"],
  [["greece"], "GR"],
  [["ukraine"], "UA"],
  [["estonia"], "EE"],
  [["lithuania"], "LT"],
  [["latvia"], "LV"],
  [["bulgaria"], "BG"],
  [["croatia"], "HR"],
  [["serbia"], "RS"],
  [["singapore"], "SG"],
  [["japan"], "JP"],
  [["south korea"], "KR"],
  [["china"], "CN"],
  [["malaysia"], "MY"],
  [["indonesia"], "ID"],
  [["thailand"], "TH"],
  [["vietnam", "viet nam"], "VN"],
  [["philippines"], "PH"],
  [["pakistan"], "PK"],
  [["bangladesh"], "BD"],
  [["sri lanka"], "LK"],
  [["nepal"], "NP"],
  [["australia"], "AU"],
  [["new zealand"], "NZ"],
  [["united arab emirates"], "AE"],
  [["saudi arabia"], "SA"],
  [["qatar"], "QA"],
  [["israel"], "IL"],
  [["turkey", "turkiye"], "TR"],
  [["egypt"], "EG"],
  [["south africa"], "ZA"],
  [["nigeria"], "NG"],
  [["kenya"], "KE"],
  [["morocco"], "MA"],
  [["brazil"], "BR"],
  [["argentina"], "AR"],
  [["chile"], "CL"],
  [["colombia"], "CO"],
  [["peru"], "PE"],
  [["uruguay"], "UY"],
  [["costa rica"], "CR"],
];

const GLOBAL_WORDS = [
  "worldwide", "world wide", "anywhere", "global", "globally", "any location",
  "remote global", "fully remote", "remote anywhere", "distributed",
];

/** Multi-country region phrases some providers ship instead of a country. */
const REGION_PHRASES: Array<[string[], Region]> = [
  [["emea", "europe", "european union", "eu remote", "remote europe", "cet timezone", "cest"], "europe"],
  [["apac", "asia pacific", "asia", "southeast asia", "sea region"], "asia"],
  [["latam", "latin america", "south america"], "latin-america"],
  [["north america", "namer", "usa canada", "us canada"], "north-america"],
  [["mena", "middle east"], "middle-east"],
  [["africa"], "africa"],
  [["anz", "oceania", "australia new zealand"], "oceania"],
];

function norm(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s,._/()-]/g, " ")
    .replace(/[._/()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasTerm(text: string, term: string): boolean {
  if (!term) return false;
  const padded = ` ${text} `;
  return padded.includes(` ${term} `) || padded.includes(` ${term},`) || padded.includes(`,${term} `);
}

function anyTerm(text: string, terms: string[]): boolean {
  return terms.some((t) => hasTerm(text, t));
}

/** Resolve the ISO country code from free-form location text. */
export function resolveCountryCode(...parts: Array<string | null | undefined>): string | null {
  const text = norm(parts.filter(Boolean).join(" , "));
  if (!text) return null;

  for (const [aliases, code] of COUNTRY_ALIASES) {
    if (anyTerm(text, aliases)) return code;
  }
  if (anyTerm(text, INDIA_CITIES) || anyTerm(text, INDIA_STATES)) return "IN";
  if (anyTerm(text, US_CITIES) || anyTerm(text, US_STATE_NAMES)) return "US";
  for (const [cities, code] of CITY_COUNTRY) {
    if (anyTerm(text, cities)) return code;
  }
  // Bare US state abbreviations ("CA", "NY", "TX") come last so "CA" never
  // beats "Canada" or an Indian/European city sitting in the same string.
  if (anyTerm(text, US_STATE_ABBR)) return "US";
  return null;
}

/** Full geo classification: country + macro region + worldwide flag. */
export function resolveGeo(...parts: Array<string | null | undefined>): Geo {
  const text = norm(parts.filter(Boolean).join(" , "));
  const code = resolveCountryCode(text);
  if (code) {
    return {
      countryCode: code,
      country: COUNTRY_NAMES[code] ?? code,
      region: COUNTRY_REGION[code] ?? "unknown",
      worldwide: false,
    };
  }
  for (const [phrases, region] of REGION_PHRASES) {
    if (anyTerm(text, phrases)) {
      return { countryCode: null, country: null, region, worldwide: false };
    }
  }
  if (anyTerm(text, GLOBAL_WORDS)) {
    return { countryCode: null, country: null, region: "global", worldwide: true };
  }
  return { countryCode: null, country: null, region: "unknown", worldwide: false };
}

/** True when the text resolves to India. */
export function isIndiaText(...parts: Array<string | null | undefined>): boolean {
  return resolveCountryCode(...parts) === "IN";
}

/** True when the text names an Indian city (not just "India"). */
export function isIndianCity(...parts: Array<string | null | undefined>): boolean {
  const text = norm(parts.filter(Boolean).join(" , "));
  return anyTerm(text, INDIA_CITIES);
}

/** Human label for a resolved geo, for badges and reports. */
export function geoLabel(geo: Geo): string {
  if (geo.country) return geo.country;
  if (geo.worldwide) return "Worldwide";
  return REGION_LABELS[geo.region];
}
