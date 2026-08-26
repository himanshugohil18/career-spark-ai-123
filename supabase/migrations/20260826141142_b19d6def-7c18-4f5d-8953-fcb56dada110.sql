ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS geo_region text;

CREATE OR REPLACE FUNCTION public.resolve_country_code(_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  IF _text IS NULL THEN RETURN NULL; END IF;
  t := ' ' || regexp_replace(lower(_text), '[^a-z0-9]+', ' ', 'g') || ' ';

  -- explicit country names first
  IF t ~ ' (india|bharat) ' THEN RETURN 'IN'; END IF;
  IF t ~ ' (united states|usa|u s a|america|us|u s) ' THEN RETURN 'US'; END IF;
  IF t ~ ' canada ' THEN RETURN 'CA'; END IF;
  IF t ~ ' mexico ' THEN RETURN 'MX'; END IF;
  IF t ~ ' (united kingdom|uk|u k|britain|england|scotland|wales) ' THEN RETURN 'GB'; END IF;
  IF t ~ ' ireland ' THEN RETURN 'IE'; END IF;
  IF t ~ ' germany ' THEN RETURN 'DE'; END IF;
  IF t ~ ' france ' THEN RETURN 'FR'; END IF;
  IF t ~ ' netherlands ' THEN RETURN 'NL'; END IF;
  IF t ~ ' spain ' THEN RETURN 'ES'; END IF;
  IF t ~ ' portugal ' THEN RETURN 'PT'; END IF;
  IF t ~ ' italy ' THEN RETURN 'IT'; END IF;
  IF t ~ ' switzerland ' THEN RETURN 'CH'; END IF;
  IF t ~ ' austria ' THEN RETURN 'AT'; END IF;
  IF t ~ ' belgium ' THEN RETURN 'BE'; END IF;
  IF t ~ ' sweden ' THEN RETURN 'SE'; END IF;
  IF t ~ ' norway ' THEN RETURN 'NO'; END IF;
  IF t ~ ' denmark ' THEN RETURN 'DK'; END IF;
  IF t ~ ' finland ' THEN RETURN 'FI'; END IF;
  IF t ~ ' poland ' THEN RETURN 'PL'; END IF;
  IF t ~ ' (czechia|czech republic) ' THEN RETURN 'CZ'; END IF;
  IF t ~ ' romania ' THEN RETURN 'RO'; END IF;
  IF t ~ ' hungary ' THEN RETURN 'HU'; END IF;
  IF t ~ ' greece ' THEN RETURN 'GR'; END IF;
  IF t ~ ' ukraine ' THEN RETURN 'UA'; END IF;
  IF t ~ ' estonia ' THEN RETURN 'EE'; END IF;
  IF t ~ ' lithuania ' THEN RETURN 'LT'; END IF;
  IF t ~ ' latvia ' THEN RETURN 'LV'; END IF;
  IF t ~ ' bulgaria ' THEN RETURN 'BG'; END IF;
  IF t ~ ' croatia ' THEN RETURN 'HR'; END IF;
  IF t ~ ' serbia ' THEN RETURN 'RS'; END IF;
  IF t ~ ' singapore ' THEN RETURN 'SG'; END IF;
  IF t ~ ' japan ' THEN RETURN 'JP'; END IF;
  IF t ~ ' (south korea|korea) ' THEN RETURN 'KR'; END IF;
  IF t ~ ' china ' THEN RETURN 'CN'; END IF;
  IF t ~ ' hong kong ' THEN RETURN 'HK'; END IF;
  IF t ~ ' taiwan ' THEN RETURN 'TW'; END IF;
  IF t ~ ' malaysia ' THEN RETURN 'MY'; END IF;
  IF t ~ ' indonesia ' THEN RETURN 'ID'; END IF;
  IF t ~ ' thailand ' THEN RETURN 'TH'; END IF;
  IF t ~ ' (vietnam|viet nam) ' THEN RETURN 'VN'; END IF;
  IF t ~ ' philippines ' THEN RETURN 'PH'; END IF;
  IF t ~ ' pakistan ' THEN RETURN 'PK'; END IF;
  IF t ~ ' bangladesh ' THEN RETURN 'BD'; END IF;
  IF t ~ ' sri lanka ' THEN RETURN 'LK'; END IF;
  IF t ~ ' nepal ' THEN RETURN 'NP'; END IF;
  IF t ~ ' australia ' THEN RETURN 'AU'; END IF;
  IF t ~ ' new zealand ' THEN RETURN 'NZ'; END IF;
  IF t ~ ' (united arab emirates|uae|dubai|abu dhabi) ' THEN RETURN 'AE'; END IF;
  IF t ~ ' saudi arabia ' THEN RETURN 'SA'; END IF;
  IF t ~ ' qatar ' THEN RETURN 'QA'; END IF;
  IF t ~ ' israel ' THEN RETURN 'IL'; END IF;
  IF t ~ ' (turkey|turkiye) ' THEN RETURN 'TR'; END IF;
  IF t ~ ' egypt ' THEN RETURN 'EG'; END IF;
  IF t ~ ' south africa ' THEN RETURN 'ZA'; END IF;
  IF t ~ ' nigeria ' THEN RETURN 'NG'; END IF;
  IF t ~ ' kenya ' THEN RETURN 'KE'; END IF;
  IF t ~ ' morocco ' THEN RETURN 'MA'; END IF;
  IF t ~ ' (brazil|brasil) ' THEN RETURN 'BR'; END IF;
  IF t ~ ' argentina ' THEN RETURN 'AR'; END IF;
  IF t ~ ' chile ' THEN RETURN 'CL'; END IF;
  IF t ~ ' colombia ' THEN RETURN 'CO'; END IF;
  IF t ~ ' peru ' THEN RETURN 'PE'; END IF;
  IF t ~ ' uruguay ' THEN RETURN 'UY'; END IF;
  IF t ~ ' costa rica ' THEN RETURN 'CR'; END IF;

  -- Indian cities / states
  IF t ~ ' (bengaluru|bangalore|blr|mumbai|bombay|navi mumbai|thane|delhi|new delhi|ncr|noida|gurgaon|gurugram|faridabad|ghaziabad|pune|pimpri|chinchwad|hyderabad|secunderabad|chennai|madras|kolkata|calcutta|ahmedabad|gandhinagar|jaipur|indore|bhopal|surat|vadodara|baroda|rajkot|kochi|cochin|ernakulam|trivandrum|thiruvananthapuram|coimbatore|madurai|mysore|mysuru|chandigarh|mohali|panchkula|lucknow|kanpur|nagpur|nashik|visakhapatnam|vizag|vijayawada|bhubaneswar|guwahati|dehradun|raipur|ranchi|patna|varanasi|agra|amritsar|ludhiana|jodhpur|udaipur|kota|panaji|trichy|tiruchirappalli|salem|hubli|belgaum|mangalore|mangaluru|jamshedpur|siliguri|howrah|durgapur|anand|nadiad|navsari|jamnagar|bhavnagar|hosur|warangal|tirupati|puducherry|pondicherry|shimla|jammu|srinagar) ' THEN RETURN 'IN'; END IF;
  IF t ~ ' (gujarat|maharashtra|karnataka|tamil nadu|telangana|kerala|rajasthan|punjab|haryana|west bengal|uttar pradesh|madhya pradesh|andhra pradesh|odisha|orissa|bihar|jharkhand|assam|chhattisgarh|uttarakhand|himachal pradesh) ' THEN RETURN 'IN'; END IF;

  -- US cities / states
  IF t ~ ' (san francisco|bay area|silicon valley|new york city|new york|nyc|brooklyn|manhattan|seattle|austin|boston|chicago|los angeles|san diego|san jose|palo alto|mountain view|sunnyvale|santa clara|cupertino|redmond|bellevue|denver|boulder|atlanta|dallas|houston|phoenix|portland|philadelphia|pittsburgh|miami|orlando|tampa|minneapolis|detroit|nashville|charlotte|raleigh|durham|columbus|cincinnati|cleveland|kansas city|st louis|salt lake city|las vegas|sacramento|irvine|oakland|arlington|alexandria|reston|mclean|ann arbor|madison|boise|omaha|richmond|baltimore) ' THEN RETURN 'US'; END IF;
  IF t ~ ' (alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming|district of columbia|puerto rico) ' THEN RETURN 'US'; END IF;

  -- other hubs
  IF t ~ ' (toronto|vancouver|montreal|ottawa|calgary|waterloo|mississauga|ontario|quebec|british columbia|alberta) ' THEN RETURN 'CA'; END IF;
  IF t ~ ' (london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|cambridge|oxford|reading) ' THEN RETURN 'GB'; END IF;
  IF t ~ ' (dublin|cork|galway) ' THEN RETURN 'IE'; END IF;
  IF t ~ ' (berlin|munich|hamburg|frankfurt|cologne|stuttgart|dusseldorf|leipzig) ' THEN RETURN 'DE'; END IF;
  IF t ~ ' (paris|lyon|toulouse|marseille|bordeaux|nantes|lille) ' THEN RETURN 'FR'; END IF;
  IF t ~ ' (amsterdam|rotterdam|utrecht|eindhoven|the hague) ' THEN RETURN 'NL'; END IF;
  IF t ~ ' (madrid|barcelona|valencia|seville|malaga) ' THEN RETURN 'ES'; END IF;
  IF t ~ ' (lisbon|lisboa|porto) ' THEN RETURN 'PT'; END IF;
  IF t ~ ' (milan|milano|rome|roma|turin|bologna) ' THEN RETURN 'IT'; END IF;
  IF t ~ ' (zurich|geneva|lausanne|basel) ' THEN RETURN 'CH'; END IF;
  IF t ~ ' (vienna|wien|graz) ' THEN RETURN 'AT'; END IF;
  IF t ~ ' (brussels|antwerp|ghent) ' THEN RETURN 'BE'; END IF;
  IF t ~ ' (stockholm|gothenburg|malmo) ' THEN RETURN 'SE'; END IF;
  IF t ~ ' (oslo|bergen) ' THEN RETURN 'NO'; END IF;
  IF t ~ ' (copenhagen|aarhus) ' THEN RETURN 'DK'; END IF;
  IF t ~ ' (helsinki|espoo|tampere) ' THEN RETURN 'FI'; END IF;
  IF t ~ ' (warsaw|krakow|wroclaw|gdansk|poznan) ' THEN RETURN 'PL'; END IF;
  IF t ~ ' (prague|praha|brno) ' THEN RETURN 'CZ'; END IF;
  IF t ~ ' (bucharest|cluj|timisoara) ' THEN RETURN 'RO'; END IF;
  IF t ~ ' budapest ' THEN RETURN 'HU'; END IF;
  IF t ~ ' (athens|thessaloniki) ' THEN RETURN 'GR'; END IF;
  IF t ~ ' (kyiv|kiev|lviv) ' THEN RETURN 'UA'; END IF;
  IF t ~ ' tallinn ' THEN RETURN 'EE'; END IF;
  IF t ~ ' (vilnius|kaunas) ' THEN RETURN 'LT'; END IF;
  IF t ~ ' riga ' THEN RETURN 'LV'; END IF;
  IF t ~ ' sofia ' THEN RETURN 'BG'; END IF;
  IF t ~ ' zagreb ' THEN RETURN 'HR'; END IF;
  IF t ~ ' (belgrade|novi sad) ' THEN RETURN 'RS'; END IF;
  IF t ~ ' (tokyo|osaka|kyoto|yokohama|nagoya|fukuoka) ' THEN RETURN 'JP'; END IF;
  IF t ~ ' (seoul|busan) ' THEN RETURN 'KR'; END IF;
  IF t ~ ' (beijing|shanghai|shenzhen|guangzhou|hangzhou) ' THEN RETURN 'CN'; END IF;
  IF t ~ ' (taipei|hsinchu) ' THEN RETURN 'TW'; END IF;
  IF t ~ ' (kuala lumpur|penang|cyberjaya|johor) ' THEN RETURN 'MY'; END IF;
  IF t ~ ' (jakarta|bandung|surabaya|bali) ' THEN RETURN 'ID'; END IF;
  IF t ~ ' (bangkok|chiang mai|phuket) ' THEN RETURN 'TH'; END IF;
  IF t ~ ' (ho chi minh|hanoi|saigon|da nang) ' THEN RETURN 'VN'; END IF;
  IF t ~ ' (manila|cebu|makati|taguig|quezon city) ' THEN RETURN 'PH'; END IF;
  IF t ~ ' (karachi|lahore|islamabad) ' THEN RETURN 'PK'; END IF;
  IF t ~ ' (dhaka|chittagong) ' THEN RETURN 'BD'; END IF;
  IF t ~ ' colombo ' THEN RETURN 'LK'; END IF;
  IF t ~ ' kathmandu ' THEN RETURN 'NP'; END IF;
  IF t ~ ' (sydney|melbourne|brisbane|perth|adelaide|canberra) ' THEN RETURN 'AU'; END IF;
  IF t ~ ' (auckland|wellington|christchurch) ' THEN RETURN 'NZ'; END IF;
  IF t ~ ' (riyadh|jeddah|dammam) ' THEN RETURN 'SA'; END IF;
  IF t ~ ' doha ' THEN RETURN 'QA'; END IF;
  IF t ~ ' (tel aviv|jerusalem|haifa|herzliya) ' THEN RETURN 'IL'; END IF;
  IF t ~ ' (istanbul|ankara|izmir) ' THEN RETURN 'TR'; END IF;
  IF t ~ ' (cairo|giza) ' THEN RETURN 'EG'; END IF;
  IF t ~ ' (johannesburg|cape town|durban|pretoria) ' THEN RETURN 'ZA'; END IF;
  IF t ~ ' (lagos|abuja) ' THEN RETURN 'NG'; END IF;
  IF t ~ ' (nairobi|mombasa) ' THEN RETURN 'KE'; END IF;
  IF t ~ ' (casablanca|rabat|marrakech) ' THEN RETURN 'MA'; END IF;
  IF t ~ ' (sao paulo|rio de janeiro|brasilia|belo horizonte|curitiba) ' THEN RETURN 'BR'; END IF;
  IF t ~ ' (buenos aires|rosario) ' THEN RETURN 'AR'; END IF;
  IF t ~ ' santiago ' THEN RETURN 'CL'; END IF;
  IF t ~ ' (bogota|medellin|cali) ' THEN RETURN 'CO'; END IF;
  IF t ~ ' lima ' THEN RETURN 'PE'; END IF;
  IF t ~ ' montevideo ' THEN RETURN 'UY'; END IF;
  IF t ~ ' (mexico city|guadalajara|monterrey|cdmx) ' THEN RETURN 'MX'; END IF;

  -- bare US state abbreviations last
  IF t ~ ' (al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc|pr) ' THEN RETURN 'US'; END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.country_region(_code text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _code = 'IN' THEN 'india'
    WHEN _code IN ('US','CA','MX') THEN 'north-america'
    WHEN _code IN ('GB','IE','DE','FR','NL','ES','PT','IT','CH','AT','BE','SE','NO','DK','FI','PL','CZ','RO','HU','GR','UA','EE','LT','LV','BG','HR','RS') THEN 'europe'
    WHEN _code IN ('SG','JP','KR','CN','HK','TW','MY','ID','TH','VN','PH','PK','BD','LK','NP') THEN 'asia'
    WHEN _code IN ('AU','NZ') THEN 'oceania'
    WHEN _code IN ('AE','SA','QA','IL','TR') THEN 'middle-east'
    WHEN _code IN ('EG','ZA','NG','KE','MA') THEN 'africa'
    WHEN _code IN ('BR','AR','CL','CO','PE','UY','CR') THEN 'latin-america'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.jobs_set_geo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  blob text;
  code text;
BEGIN
  blob := coalesce(NEW.location, '') || ' , ' || coalesce(NEW.location_country, '');
  code := public.resolve_country_code(blob);
  NEW.country_code := code;
  IF code IS NOT NULL THEN
    NEW.geo_region := public.country_region(code);
  ELSIF lower(blob) ~ '(worldwide|anywhere|global)' THEN
    NEW.geo_region := 'global';
  ELSIF lower(blob) ~ '(emea|europe)' THEN
    NEW.geo_region := 'europe';
  ELSIF lower(blob) ~ '(apac|asia pacific|asia)' THEN
    NEW.geo_region := 'asia';
  ELSIF lower(blob) ~ '(latam|latin america)' THEN
    NEW.geo_region := 'latin-america';
  ELSE
    NEW.geo_region := 'unknown';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jobs_set_geo ON public.jobs;
CREATE TRIGGER trg_jobs_set_geo
BEFORE INSERT OR UPDATE OF location, location_country ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.jobs_set_geo();

UPDATE public.jobs
SET country_code = public.resolve_country_code(coalesce(location,'') || ' , ' || coalesce(location_country,''));

UPDATE public.jobs
SET geo_region = CASE
  WHEN country_code IS NOT NULL THEN public.country_region(country_code)
  WHEN lower(coalesce(location,'') || ' ' || coalesce(location_country,'')) ~ '(worldwide|anywhere|global)' THEN 'global'
  WHEN lower(coalesce(location,'') || ' ' || coalesce(location_country,'')) ~ '(emea|europe)' THEN 'europe'
  WHEN lower(coalesce(location,'') || ' ' || coalesce(location_country,'')) ~ '(apac|asia pacific|asia)' THEN 'asia'
  WHEN lower(coalesce(location,'') || ' ' || coalesce(location_country,'')) ~ '(latam|latin america)' THEN 'latin-america'
  ELSE 'unknown'
END;

CREATE INDEX IF NOT EXISTS idx_jobs_country_code ON public.jobs (country_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_jobs_geo_region ON public.jobs (geo_region) WHERE is_active;