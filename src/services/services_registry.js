// src/services/services_registry.js - Bahrain Civil Defense Services Registry & Normalization Engine

const masterServiceCatalogMap = {
  "safety_certificate_renewal": "إصدار شهادة استيفاء شروط واحتياجات الحماية والوقاية من الحريق وتجديدها",
  "Safety Certificate Renewal": "إصدار شهادة استيفاء شروط واحتياجات الحماية والوقاية من الحريق وتجديدها",
  "gas_selling_shops_license": "إصدار ترخيص محلات بيع الغاز، وتجديد الترخيص",
  "Gas Selling Shops License": "إصدار ترخيص محلات بيع الغاز، وتجديد الترخيص",
  "bakery_license": "إصدار ترخيص المخابز الشعبية والآلية، وتجديد الترخيص",
  "Bakery License": "إصدار ترخيص المخابز الشعبية والآلية، وتجديد الترخيص",
  "gold_shop_license": "إصدار ترخيص محلات وورش الذهب، وتجديد الترخيص",
  "Gold Shop License": "إصدار ترخيص محلات وورش الذهب، وتجديد الترخيص",
  "trainee_registration": "إصدار الترخيص لمعاهد ومراكز التدريب على أعمال الدفاع المدني",
  "Trainee Registration": "إصدار الترخيص لمعاهد ومراكز التدريب على أعمال الدفاع المدني",
  "gas_station_license": "إصدار الترخيص لمحطات تزويد الوقود، وتجديد الترخيص",
  "Gas Station License": "إصدار الترخيص لمحطات تزويد الوقود، وتجديد الترخيص",
  "hazardous_material_permit": "إصدار ترخيص عدم ممانعة لتخزين مواد كيميائية أو المتفجرات، وتجديد الترخيص",
  "Hazardous Material Permit": "إصدار ترخيص عدم ممانعة لتخزين مواد كيميائية أو المتفجرات، وتجديد الترخيص",
  "factories_hotels_malls_inspection_certificate": "إصدار شهادة فحص المصانع والفنادق والمجمعات التجارية قيد الإنشاء وتجديدها",
  "incident_report_large_facilities": "إصدار تقرير الحوادث للمنشآت الكبيرة والمصانع والفنادق والمجمعات التجارية وما في حكمها",
  "incident_report_small_facilities_homes": "إصدار تقرير الحوادث للمنشآت الصغيرة والمنازل وما في حكمها",
  "electrical_connection_final_inspection": "إصدار شهادة الفحص النهائي لتوصيل التيار الكهربائي للمباني الجديدة",
  "factory_warehouse_maps_license": "إصدار ترخيص خرائط المصانع والمخازن وتجديد الترخيص",
  "commercial_centers_high_rise_maps_license": "إصدار ترخيص خرائط المراكز التجارية والمباني العالية",
  "residential_complexes_maps_license": "إصدار ترخيص خرائط المجمعات السكنية التي تحتوي على عشر فلل فأكثر",
  "worship_courts_museums_maps_review": "دراسة مخططات دور العبادة والمحاكم والمتاحف",
  "new_gas_stations_maps_review": "دراسة الخرائط لمحطات الوقود الجديدة",
  "electrical_engineering_plans_review": "دراسة المخططات الهندسية الكهربائية",
  "mechanical_engineering_plans_review": "دراسة المخططات الميكانيكية",
  "gas_piping_tanks_maps_review": "دراسة الخرائط على تمديدات الغاز والخزانات",
  "trainee_registration_1day": "إصدار شهادة تدريب على أعمال الدفاع المدني لمدة يوم واحد",
  "trainee_registration_1week": "إصدار شهادة تدريب على أعمال الدفاع المدني لمدة  اسبوع",
  "heavy_fire_vehicle_driving_training": "إصدار شهادة تدريب أفراد منشآت ومؤسسات القطاع الخاص على قيادة مركبات الإطفاء الثقيلة لمدة أسبوعين",
  "trainee_registration_16weeks": "إصدار شهادة تدريب الفرد على أعمال الدفاع المدني لمدة ستة عشر أسبوعًا.",
  "building_evacuation_training": "التدريب على عمليات إخلاء المباني والمنشآت",
  "fire_safety_equipment_license": "إصدار الترخيص لمعدات الحريق والسلامة، وتجديد الترخيص",
  "fire_safety_equipment_noc": "إصدار ترخيص عدم الممانعة لمعدات الحريق والسلامة، وتجديد الترخيص",
  "local_fire_equipment_factory_license": "إصدار الترخيص لمصنع محلي لمعدات الإطفاء والوقاية من الحريق، وتجديد الترخيص",
  "alarm_firefighting_maintenance_offices_license": "إصدار الترخيص للمكاتب الفنية ومكاتب صيانة أجهزة الإنذار والإطفاء، وتجديد الترخيص",
  "hazardous_materials_1day_transport": "ترخيص بالموافقة على نقل شحنات المواد الخطرة ليوم واحد",
  "chemical_hazmat_transport_vehicles_license": "إصدار ترخيص الموافقة على سيارات نقل المواد الكيميائية والخطرة، وتجديد الترخيص",
  "diesel_gas_tanks_installation_license": "إصدار ترخيص الموافقة النهائية على تركيب خزانات الديزل والغاز، وتجديد الترخيص",
  "consulting_offices_gas_fuel_hazmat_license": "إصدار الترخيص للمكاتب الفنية والاستشارية المختصة بالغاز والوقود والمواد الخطرة، وتجديد الترخيص",
  "engineering_offices_fire_protection_license": "ترخيص المكاتب الهندسية لتصميم أنظمة الحماية والوقاية من الحريق وتجديد الترخيص",
  "small_facilities_inspection_certificate": "إصدار شهادة فحص المنشآت الصغيرة، وتجديد الشهادة",
  "certified_prevention_inspector": "مفتش وقاية معتمد",
  "fire_equipment_sales_license": "ترخيص بيع وتداول وتخزين معدات الحريق",
  "fireworks_import_license": "ترخيص استيراد وتخزين الألعاب النارية",
  "explosives_import_permit": "ترخيص استيراد مواد خطرة ومتفجرات",
  "temporary_event_tents_permit": "طلب ترخيص الخيام للمناسبات العامة والخاصة المؤقتة"
};

const SERVICES_REGISTRY = [
  {
    id: "safety_certificate_renewal",
    canonicalEn: "Safety Certificate Renewal",
    arabicName: "إصدار شهادة استيفاء شروط واحتياجات الحماية والوقاية من الحريق وتجديدها",
    aliases: ["تجديد شهادة السلامة","استيفاء شروط","احتياجات الحماية","الوقاية من الحريق","شروط السلامة","شهادة السلامة","شهاده السلامه","شهادة استيفاء","safety certificate","safety certificate renewal","fire safety certificate","fire protection certificate","fire prevention certificate","safety compliance"]
  },
  {
    id: "gas_selling_shops_license",
    canonicalEn: "Gas Selling Shops License",
    arabicName: "إصدار ترخيص محلات بيع الغاز، وتجديد الترخيص",
    aliases: ["محل غاز","محلات بيع الغاز","بيع الغاز","ترخيص الغاز","سلندر غاز","سلندرات","ترخيص محل غاز","محلات الغاز","gas shop","gas selling shop","gas shop license","gas cylinder shop","gas retail","propane shop"]
  },
  {
    id: "bakery_license",
    canonicalEn: "Bakery License",
    arabicName: "إصدار ترخيص المخابز الشعبية والآلية، وتجديد الترخيص",
    aliases: ["مخبز","مخابز","ترخيص المخابز","فرن شعبى","مخبز آلي","مخابز شعبية","فرن","ترخيص مخبز","bakery","bakery license","bakeries","traditional bakery","automated bakery","bread shop"]
  },
  {
    id: "gold_shop_license",
    canonicalEn: "Gold Shop License",
    arabicName: "إصدار ترخيص محلات وورش الذهب، وتجديد الترخيص",
    aliases: ["ذهب","محل ذهب","ورشة ذهب","ورش الذهب","مجوهرات","انذار الذهب","ترخيص ذهب","ترخيص محل ذهب","gold shop","gold shop license","gold workshop","jewelry shop","jewellery","gold alarm"]
  },
  {
    id: "trainee_registration",
    canonicalEn: "Civil Defense Training Centers License",
    arabicName: "إصدار الترخيص لمعاهد ومراكز التدريب على أعمال الدفاع المدني",
    aliases: ["Trainee Registration","تسجيل متدربين","معاهد التدريب","مراكز التدريب","تدريب الدفاع المدني","تسجيل متدرب","مركز تدريب","ترخيص مركز تدريب","trainee","trainee registration","training center","training institute","civil defense training institute","training center license"]
  },
  {
    id: "gas_station_license",
    canonicalEn: "Gas Station License",
    arabicName: "إصدار الترخيص لمحطات تزويد الوقود، وتجديد الترخيص",
    aliases: ["محطة وقود","تزويد الوقود","بترول","وقود ديزل","محطة البترول","محطه وقود","محطات بيع الوقود","بيع الوقود","محطة بيع الوقود","تصريح محطات وقود","تصريح محطة وقود","تصريح محطات الوقود","محطات وقود","تصريح محروقات","تصريح محطة الوقود","ترخيص محطة وقود","ترخيص محطات وقود","اقدم حق تصريح محطات وقود","gas station","gas station license","fuel station","petrol station","fuel supply station"]
  },
  {
    id: "hazardous_material_permit",
    canonicalEn: "Hazardous Material Permit",
    arabicName: "إصدار ترخيص عدم ممانعة لتخزين مواد كيميائية أو المتفجرات، وتجديد الترخيص",
    aliases: ["تخزين مواد خطرة","مواد كيميائية","تخزين مواد كيميائية","تخزين مواد","مادة خطرة","ترخيص مواد كيميائية","hazardous material","hazardous material permit","chemical storage","chemical permit","hazmat permit"]
  },
  {
    id: "factories_hotels_malls_inspection_certificate",
    canonicalEn: "Inspection Certificate for Factories, Hotels, & Malls under Construction",
    arabicName: "إصدار شهادة فحص المصانع والفنادق والمجمعات التجارية قيد الإنشاء وتجديدها",
    aliases: ["فحص المصانع","فحص الفنادق","مجمعات تجارية","قيد الإنشاء","إنشاء وتجديد","فحص مصنع","فندق قيد الإنشاء","شهادة فحص المباني قيد الإنشاء","factory inspection","hotel inspection","mall inspection","under construction inspection","commercial complex inspection"]
  },
  {
    id: "incident_report_large_facilities",
    canonicalEn: "Incident Report for Large Facilities, Factories, & Malls",
    arabicName: "إصدار تقرير الحوادث للمنشآت الكبيرة والمصانع والفنادق والمجمعات التجارية وما في حكمها",
    aliases: ["تقرير الحوادث للمنشآت الكبيرة","تقرير حادث مصنع","تقرير حادث فندق","حادث مجمع تجاري","تقرير حريق كبير","حادث منشأة كبيرة","incident report large","large facility incident","factory incident report","hotel fire report","mall fire report"]
  },
  {
    id: "incident_report_small_facilities_homes",
    canonicalEn: "Incident Report for Small Facilities & Homes",
    arabicName: "إصدار تقرير الحوادث للمنشآت الصغيرة والمنازل وما في حكمها",
    aliases: ["تقرير الحوادث للأشخاص","تقرير الحوادث","تقرير حادث","تقرير حوادث","تقرير الحوادث للأفراد","تقرير حادث شخصي","تقرير حادث منزلي","تقرير حادث بيت","حادث بسيط","حريق منزل","حادث منشأة صغيرة","حريق بيت","incident report small","home incident report","house fire report","personal incident report","small facility report"]
  },
  {
    id: "electrical_connection_final_inspection",
    canonicalEn: "Final Inspection Certificate for Electrical Connection",
    arabicName: "إصدار شهادة الفحص النهائي لتوصيل التيار الكهربائي للمباني الجديدة",
    aliases: ["تيار كهربائي","توصيل الكهرباء","فحص نهائي كهرباء","توصيل تيار","كهرباء مبنى جديد","فحص كهرباء","شهادة الفحص النهائي لتوصيل التيار الكهربائي","electrical connection","power connection","final electrical inspection","electricity connection","new building electricity"]
  },
  {
    id: "factory_warehouse_maps_license",
    canonicalEn: "Factory & Warehouse Maps License",
    arabicName: "إصدار ترخيص خرائط المصانع والمخازن وتجديد الترخيص",
    aliases: ["خرائط مصانع","مخازن وتجديد","مخطط مستودع","مخطط مصنع","خريطة مخزن","ترخيص خرائط المصانع والمخازن","factory map","warehouse map","factory blueprint","warehouse plan","factory warehouse maps license","factory maps license"]
  },
  {
    id: "commercial_centers_high_rise_maps_license",
    canonicalEn: "Commercial Centers & High-Rise Buildings Maps License",
    arabicName: "إصدار ترخيص خرائط المراكز التجارية والمباني العالية",
    aliases: ["خرائط مراكز تجارية","مباني عالية","خرائط مبنى مرتفع","مخططات أبراج","خرائط برج","ترخيص خرائط المراكز التجارية","commercial center map","high rise building map","tower map","high rise blueprint","commercial mall maps"]
  },
  {
    id: "residential_complexes_maps_license",
    canonicalEn: "Residential Complexes Maps License (10+ Villas)",
    arabicName: "إصدار ترخيص خرائط المجمعات السكنية التي تحتوي على عشر فلل فأكثر",
    aliases: ["خرائط مجمعات سكنية","عشر فلل","مخطط مجمع فلل","خريطة مجمع سكني","مجمع 10 فلل","residential complex map","villas complex map","housing complex map","10 villas map"]
  },
  {
    id: "worship_courts_museums_maps_review",
    canonicalEn: "Review of Maps for Places of Worship, Courts, & Museums",
    arabicName: "دراسة مخططات دور العبادة والمحاكم والمتاحف",
    aliases: ["دور العبادة","مخطط مسجد","مخططات متاحف","مخطط محكمة","مخطط معبد","دراسة مخططات دور العبادة","worship place map","mosque plan","court plan","museum plan","worship review"]
  },
  {
    id: "new_gas_stations_maps_review",
    canonicalEn: "Review of Maps for New Fuel Stations",
    arabicName: "دراسة الخرائط لمحطات الوقود الجديدة",
    aliases: ["خرائط محطة وقود","مخطط محطة وقود جديدة","مخطط بترول جديد","دراسة الخرائط لمحطات الوقود","new gas station map","fuel station map review","petrol station blueprint"]
  },
  {
    id: "electrical_engineering_plans_review",
    canonicalEn: "Review of Electrical Engineering Plans",
    arabicName: "دراسة المخططات الهندسية الكهربائية",
    aliases: ["مخططات هندسية كهربائية","مخطط كهربائي هندسي","خرائط كهرباء هندسية","دراسة المخططات الكهربائية","electrical engineering plan","electrical blueprint","electrical wiring plan review","electrical connection review"]
  },
  {
    id: "mechanical_engineering_plans_review",
    canonicalEn: "Review of Mechanical Engineering Plans",
    arabicName: "دراسة المخططات الميكانيكية",
    aliases: ["مخططات ميكانيكية","مخطط ميكانيكي","خريطة ميكانيك","mechanical plan review","mechanical blueprint","mechanical engineering drawings"]
  },
  {
    id: "gas_piping_tanks_maps_review",
    canonicalEn: "Review of Maps for Gas Extension Lines & Tanks",
    arabicName: "دراسة الخرائط على تمديدات الغاز والخزانات",
    aliases: ["تمديدات الغاز والخزانات","مخطط تمديد غاز","خريطة خزان غاز","دراسة خرائط تمديدات الغاز","gas piping map","gas tank plan","gas extension blueprint","gas pipe design"]
  },
  {
    id: "trainee_registration_1day",
    canonicalEn: "Civil Defense Training Certificate (1 Day)",
    arabicName: "إصدار شهادة تدريب على أعمال الدفاع المدني لمدة يوم واحد",
    aliases: ["تدريب يوم واحد","شهادة تدريب يوم","دورة يوم","تدريب لمدة يوم","trainee registration 1day","1 day training","one day civil defense training","1 day course"]
  },
  {
    id: "trainee_registration_1week",
    canonicalEn: "Civil Defense Training Certificate (1 Week)",
    arabicName: "إصدار شهادة تدريب على أعمال الدفاع المدني لمدة  اسبوع",
    aliases: ["تدريب اسبوع","دورة أسبوع","تدريب لمدة أسبوع","دورة اسبوع","1 week training","one week training course","7 days training"]
  },
  {
    id: "heavy_fire_vehicle_driving_training",
    canonicalEn: "Heavy Firefighting Vehicle Driving Training Certificate (2 Weeks)",
    arabicName: "إصدار شهادة تدريب أفراد منشآت ومؤسسات القطاع الخاص على قيادة مركبات الإطفاء الثقيلة لمدة أسبوعين",
    aliases: ["مركبات الإطفاء الثقيلة","سياقة سيارة إطفاء","تدريب قيادة إطفاء","شاحنة إطفاء ثقيلة","heavy fire vehicle","firefighting truck driving","heavy fire truck training","fire engine driving"]
  },
  {
    id: "trainee_registration_16weeks",
    canonicalEn: "Civil Defense Individual Training Certificate (16 Weeks)",
    arabicName: "إصدار شهادة تدريب الفرد على أعمال الدفاع المدني لمدة ستة عشر أسبوعًا.",
    aliases: ["ستة عشر أسبوعا","تدريب 16 أسبوع","دورة 16 اسبوع","ستة عشر اسبوع","16 weeks training","sixteen weeks course","long civil defense training"]
  },
  {
    id: "building_evacuation_training",
    canonicalEn: "Building & Facility Evacuation Operations Training",
    arabicName: "التدريب على عمليات إخلاء المباني والمنشآت",
    aliases: ["عمليات إخلاء","إخلاء مباني","إخلاء منشآت","خطة إخلاء","تدريب اخلاء","building evacuation","evacuation training","facility evacuation drill"]
  },
  {
    id: "fire_safety_equipment_license",
    canonicalEn: "Fire Safety & Protection Equipment License",
    arabicName: "إصدار الترخيص لمعدات الحريق والسلامة، وتجديد الترخيص",
    aliases: ["معدات الحريق والسلامة","ترخيص معدات السلامة","معدات إطفاء","ترخيص معدات الحريق","fire safety equipment","fire equipment license","safety equipment renewal"]
  },
  {
    id: "fire_safety_equipment_noc",
    canonicalEn: "No-Objection Certificate (NOC) for Fire Safety Equipment",
    arabicName: "إصدار ترخيص عدم الممانعة لمعدات الحريق والسلامة، وتجديد الترخيص",
    aliases: ["عدم الممانعة لمعدات الحريق","عدم ممانعة معدات السلامة","ترخيص عدم ممانعة معدات","fire equipment noc","safety equipment no objection","equipment noc"]
  },
  {
    id: "local_fire_equipment_factory_license",
    canonicalEn: "License for Local Firefighting Equipment Factory",
    arabicName: "إصدار الترخيص لمصنع محلي لمعدات الإطفاء والوقاية من الحريق، وتجديد الترخيص",
    aliases: ["مصنع محلي لمعدات الإطفاء","مصنع معدات حريق","ترخيص مصنع إطفاء","local fire equipment factory","firefighting factory license","local safety factory"]
  },
  {
    id: "alarm_firefighting_maintenance_offices_license",
    canonicalEn: "License for Alarm & Firefighting Maintenance Offices",
    arabicName: "إصدار الترخيص للمكاتب الفنية ومكاتب صيانة أجهزة الإنذار والإطفاء، وتجديد الترخيص",
    aliases: ["مكاتب صيانة أجهزة الإنذار","مكاتب صيانة الإطفاء","مكتب فني صيانة حريق","alarm maintenance office","firefighting maintenance company","technical office license"]
  },
  {
    id: "hazardous_materials_1day_transport",
    canonicalEn: "One-Day Permit for Transporting Hazardous Material Shipments",
    arabicName: "ترخيص بالموافقة على نقل شحنات المواد الخطرة ليوم واحد",
    aliases: ["نقل شحنات المواد الخطرة ليوم واحد","نقل مواد خطرة يوم","شحنة مواد خطرة","hazardous transport 1day","chemical transport permit","1 day hazardous transport","dangerous goods transport"]
  },
  {
    id: "chemical_hazmat_transport_vehicles_license",
    canonicalEn: "Approval License for Chemical & Hazardous Transport Vehicles",
    arabicName: "إصدار ترخيص الموافقة على سيارات نقل المواد الكيميائية والخطرة، وتجديد الترخيص",
    aliases: ["سيارات نقل المواد الكيميائية","مركبات نقل مواد خطرة","ترخيص سيارة نقل كيميائي","شاحنة نقل غاز","chemical transport vehicle","hazmat truck license","hazardous transport vehicle","chemical transport"]
  },
  {
    id: "diesel_gas_tanks_installation_license",
    canonicalEn: "Final Approval License for Installing Diesel & Gas Tanks",
    arabicName: "إصدار ترخيص الموافقة النهائية على تركيب خزانات الديزل والغاز، وتجديد الترخيص",
    aliases: ["تركيب خزانات الديزل والغاز","خزانات ديزل","تركيب خزان غاز","ترخيص خزان ديزل","diesel tank","gas tank installation","diesel tank installation","fuel tank installation license"]
  },
  {
    id: "consulting_offices_gas_fuel_hazmat_license",
    canonicalEn: "License for Technical & Consulting Offices (Gas, Fuel, & Hazmat)",
    arabicName: "إصدار الترخيص للمكاتب الفنية والاستشارية المختصة بالغاز والوقود والمواد الخطرة، وتجديد الترخيص",
    aliases: ["المكاتب الفنية والاستشارية المختصة بالغاز","مكتب استشاري مواد خطرة","استشاري غاز ووقود","gas fuel consulting office","hazmat consulting office","gas technical office"]
  },
  {
    id: "engineering_offices_fire_protection_license",
    canonicalEn: "License for Engineering Offices Designing Fire Protection Systems",
    arabicName: "ترخيص المكاتب الهندسية لتصميم أنظمة الحماية والوقاية من الحريق وتجديد الترخيص",
    aliases: ["ترخيص مكاتب هندسية","مكتب تصميم أنظمة حماية","تصميم أنظمة حريق","مكتب هندسي حريق","engineering office fire protection","fire safety design office","engineering design license"]
  },
  {
    id: "small_facilities_inspection_certificate",
    canonicalEn: "Small Facilities Inspection Certificate Renewal",
    arabicName: "إصدار شهادة فحص المنشآت الصغيرة، وتجديد الشهادة",
    aliases: ["فحص المنشآت الصغيرة","فحص منشأة صغيرة","شهادة فحص منشأة صغيرة","small facilities inspection","small facility certificate","small business inspection"]
  },
  {
    id: "certified_prevention_inspector",
    canonicalEn: "Certified Prevention Inspector",
    arabicName: "مفتش وقاية معتمد",
    aliases: ["مفتش وقاية","مفتش معتمد","مفتش","prevention inspector","certified inspector"]
  },
  {
    id: "fire_equipment_sales_license",
    canonicalEn: "Fire Equipment Sales, Trading & Storage License",
    arabicName: "ترخيص بيع وتداول وتخزين معدات الحريق",
    aliases: ["بيع معدات الحريق","تداول معدات الحريق","تخزين معدات الحريق","fire equipment sales","fire equipment trading"]
  },
  {
    id: "fireworks_import_license",
    canonicalEn: "Fireworks Import & Storage License",
    arabicName: "ترخيص استيراد وتخزين الألعاب النارية",
    aliases: ["ألعاب نارية","استيراد ألعاب نارية","تخزين ألعاب نارية","مفرقعات","fireworks import","fireworks storage","fireworks"]
  },
  {
    id: "explosives_import_permit",
    canonicalEn: "Hazardous Material & Explosives Import Permit",
    arabicName: "ترخيص استيراد مواد خطرة ومتفجرات",
    aliases: ["استيراد متفجرات","مواد خطرة ومتفجرات","explosives import","explosives permit"]
  },
  {
    id: "temporary_event_tents_permit",
    canonicalEn: "Temporary Event Tents Permit",
    arabicName: "طلب ترخيص الخيام للمناسبات العامة والخاصة المؤقتة",
    aliases: ["ترخيص خيام","خيام مناسبات","خيمة","خيام مؤقتة","event tents","temporary tents","tents permit","tent"]
  }
];

function resolveOfficialServiceName(input) {
  if (!input || typeof input !== 'string') return input || '';
  const trimmed = input.trim();
  if (masterServiceCatalogMap[trimmed]) return masterServiceCatalogMap[trimmed];
  const lowered = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(masterServiceCatalogMap)) {
    if (key.toLowerCase() === lowered) return val;
  }
  return trimmed;
}

function resolveService(inputName) {
  if (!inputName || typeof inputName !== 'string') return null;
  const rawTrimmed = inputName.trim();
  if (!rawTrimmed) return null;

  // 1. Direct exact matches
  for (const svc of SERVICES_REGISTRY) {
    if (svc.id === rawTrimmed || svc.canonicalEn === rawTrimmed || svc.arabicName === rawTrimmed) {
      return svc;
    }
  }

  // 2. Case-insensitive exact matches
  const lowerInput = rawTrimmed.toLowerCase();
  for (const svc of SERVICES_REGISTRY) {
    if (svc.id.toLowerCase() === lowerInput ||
        svc.canonicalEn.toLowerCase() === lowerInput ||
        svc.arabicName.toLowerCase() === lowerInput) {
      return svc;
    }
    if (svc.aliases && svc.aliases.some(alias => alias.toLowerCase() === lowerInput)) {
      return svc;
    }
  }

  // 3. Cleaned punctuation/space normalized match
  const cleanInput = lowerInput.replace(/[,\.\-\_\s]+/g, ' ').trim();
  for (const svc of SERVICES_REGISTRY) {
    const cleanId = svc.id.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();
    const cleanEn = svc.canonicalEn.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();
    const cleanAr = svc.arabicName.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();

    if (cleanInput === cleanId || cleanInput === cleanEn || cleanInput === cleanAr) {
      return svc;
    }
    if (svc.aliases) {
      for (const alias of svc.aliases) {
        const cleanAlias = alias.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();
        if (cleanInput === cleanAlias) return svc;
      }
    }
  }

  // 4. Substring / partial match
  for (const svc of SERVICES_REGISTRY) {
    const cleanAr = svc.arabicName.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();
    const cleanEn = svc.canonicalEn.toLowerCase().replace(/[,\.\-\_\s]+/g, ' ').trim();
    if (cleanInput.length >= 5 && (cleanAr.includes(cleanInput) || cleanInput.includes(cleanAr) || cleanEn.includes(cleanInput) || cleanInput.includes(cleanEn))) {
      return svc;
    }
  }

  return null;
}

function resolveArabicStatusName(rawStatus) {
  if (!rawStatus) return 'تم استلام الطلب والتحقق المبدئي';
  const s = rawStatus.trim().toLowerCase();
  
  if (s.includes('modification') || s.includes('تعديل') || s.includes('استكمال')) {
    if (s.includes('resubmit') || s.includes('إعادة') || s.includes('تحديث')) {
      return 'تم استلام التعديل وقيد إعادة التدقيق';
    }
    return 'مطلوب تعديل بيانات ومستندات';
  }
  if (s.includes('approv') || s.includes('قبول') || s.includes('اعتماد') || s.includes('مكتمل')) {
    return 'مقبول والمعاملة معتمدة بنجاح';
  }
  if (s.includes('reject') || s.includes('رفض') || s.includes('ملغي') || s.includes('غير مستوف')) {
    return 'مرفوض / غير مستوفٍ للشروط';
  }
  if (s.includes('review') || s.includes('مراجعة') || s.includes('تدقيق') || s.includes('دراسة')) {
    return 'قيد المراجعة والتدقيق الفني';
  }
  if (s.includes('progress') || s.includes('معالجة') || s.includes('إجراء')) {
    return 'قيد المعالجة والإجراء الإداري';
  }
  if (s.includes('inspect') || s.includes('معاينة') || s.includes('فحص')) {
    return 'قيد المعاينة الميدانية';
  }
  if (s === 'pending' || s === 'submitted' || s === 'جديد' || s === 'قيد الانتظار') {
    return 'تم استلام الطلب والتحقق المبدئي';
  }
  return rawStatus;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDynamicFields(serviceInput, dynamicFields) {
  if (!dynamicFields) return "";

  if (typeof dynamicFields === 'string') {
    const trimmed = dynamicFields.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      return trimmed;
    }
    try {
      dynamicFields = JSON.parse(trimmed);
    } catch (e) {
      return trimmed;
    }
  }

  if (typeof dynamicFields !== 'object' || dynamicFields === null) {
    return String(dynamicFields);
  }

  const svc = resolveService(serviceInput);
  const svcId = svc ? svc.id : (typeof serviceInput === 'string' ? serviceInput : '');

  const parts = [];

  switch (svcId) {
    case 'trainee_registration_1day':
    case 'trainee_registration_1week':
    case 'trainee_registration_16weeks':
    case 'Civil Defense Training Certificate (1 Day)':
    case 'Civil Defense Training Certificate (1 Week)':
    case 'Civil Defense Individual Training Certificate (16 Weeks)':
    case 'إصدار شهادة تدريب على أعمال الدفاع المدني لمدة يوم واحد':
    case 'إصدار شهادة تدريب على أعمال الدفاع المدني لمدة اسبوع':
    case 'إصدار شهادة تدريب على أعمال الدفاع المدني لمدة  اسبوع':
    case 'إصدار شهادة تدريب الفرد على أعمال الدفاع المدني لمدة ستة عشر أسبوعًا.':
    case 'إصدار شهادة تدريب الفرد على أعمال الدفاع المدني لمدة ستة عشر أسبوعا.':
      if (dynamicFields.requestingEntityLetter || dynamicFields.trainingOfficialLetter) {
        const fileObj = dynamicFields.requestingEntityLetter || dynamicFields.trainingOfficialLetter;
        const doc = typeof fileObj === 'object'
          ? (fileObj.name || fileObj.url || 'مرفق كتاب رسمي من الجهة الطالبة')
          : fileObj;
        parts.push(`كتاب رسمي من الجهة الطالبة للدورة التدريبية: ${doc}`);
      }
      if (Array.isArray(dynamicFields.trainees)) {
        parts.push(`المتدربون: ${dynamicFields.trainees.join(', ')}`);
      } else if (dynamicFields.trainees) {
        parts.push(`المتدربون: ${dynamicFields.trainees}`);
      }
      break;

    case 'heavy_fire_vehicle_driving_training':
    case 'heavy_fire_vehicle_driving_training_2weeks':
    case 'Heavy Firefighting Vehicle Driving Training Certificate (2 Weeks)':
    case 'إصدار شهادة تدريب أفراد منشآت ومؤسسات القطاع الخاص على قيادة مركبات الإطفاء الثقيلة لمدة أسبوعين':
      if (dynamicFields.courseDetailsLetter || dynamicFields.trainingOfficialLetter) {
        const fileObj = dynamicFields.courseDetailsLetter || dynamicFields.trainingOfficialLetter;
        const doc = typeof fileObj === 'object'
          ? (fileObj.name || fileObj.url || 'مرفق رسالة تفاصيل الدورة')
          : fileObj;
        parts.push(`رسالة تفاصيل الدورة (النوع، اللغة، المدة، عدد المشاركين): ${doc}`);
      }
      if (Array.isArray(dynamicFields.trainees)) {
        parts.push(`المتدربون: ${dynamicFields.trainees.join(', ')}`);
      } else if (dynamicFields.trainees) {
        parts.push(`المتدربون: ${dynamicFields.trainees}`);
      }
      break;

    case 'building_evacuation_training':
    case 'Building & Facility Evacuation Operations Training':
    case 'Building Evacuation Training':
    case 'التدريب على عمليات إخلاء المباني والمنشآت':
      if (dynamicFields.applicantEntityLetter || dynamicFields.requestingEntityLetter || dynamicFields.trainingOfficialLetter) {
        const fileObj = dynamicFields.applicantEntityLetter || dynamicFields.requestingEntityLetter || dynamicFields.trainingOfficialLetter;
        const doc = typeof fileObj === 'object'
          ? (fileObj.name || fileObj.url || 'مرفق رسالة من جهة صاحب الطلب')
          : fileObj;
        parts.push(`رسالة من جهة صاحب الطلب: ${doc}`);
      }
      if (dynamicFields.buildingName) parts.push(`اسم المنشأة/المبنى: ${dynamicFields.buildingName}`);
      if (dynamicFields.traineesCount) parts.push(`عدد المشاركين: ${dynamicFields.traineesCount}`);
      break;

    case 'trainee_registration':
    case 'Trainee Registration':
      if (dynamicFields.trainingOfficialLetter) {
        const doc = typeof dynamicFields.trainingOfficialLetter === 'object'
          ? (dynamicFields.trainingOfficialLetter.name || dynamicFields.trainingOfficialLetter.url || 'مرفق الخطاب الرسمي')
          : dynamicFields.trainingOfficialLetter;
        parts.push(`خطاب رسمي: ${doc}`);
      }
      if (dynamicFields.trainingAccreditations) {
        const doc = typeof dynamicFields.trainingAccreditations === 'object'
          ? (dynamicFields.trainingAccreditations.name || dynamicFields.trainingAccreditations.url || 'مرفق الموافقات/الاعتمادات')
          : dynamicFields.trainingAccreditations;
        parts.push(`الموافقات/الاعتمادات: ${doc}`);
      }
      if (Array.isArray(dynamicFields.trainees)) {
        parts.push(`المتدربون: ${dynamicFields.trainees.join(', ')}`);
      } else if (dynamicFields.trainees) {
        parts.push(`المتدربون: ${dynamicFields.trainees}`);
      }
      break;

    case 'safety_certificate_renewal':
    case 'Safety Certificate Renewal':
      if (dynamicFields.fireInspectionReport) {
        const rep = typeof dynamicFields.fireInspectionReport === 'object'
          ? (dynamicFields.fireInspectionReport.name || dynamicFields.fireInspectionReport.url || 'مرفق تقرير الفحص')
          : dynamicFields.fireInspectionReport;
        parts.push(`تقرير فحص أنظمة الإطفاء والإنذار: ${rep}`);
      }
      if (dynamicFields.maintenanceContract) {
        const con = typeof dynamicFields.maintenanceContract === 'object'
          ? (dynamicFields.maintenanceContract.name || dynamicFields.maintenanceContract.url || 'مرفق عقد الصيانة')
          : dynamicFields.maintenanceContract;
        parts.push(`نسخة من عقد الصيانة: ${con}`);
      }
      if (dynamicFields.inspectionArea) {
        parts.push(`مساحة التفتيش: ${dynamicFields.inspectionArea} متر مربع`);
      }
      break;

    case 'hazardous_material_permit':
    case 'Hazardous Material Permit':
    case 'Chemical & Hazardous Material Storage NOC Permit':
    case 'إصدار ترخيص عدم ممانعة لتخزين مواد كيميائية أو المتفجرات، وتجديد الترخيص':
      if (dynamicFields.materialsScientificName) {
        parts.push(`الاسم العلمي للمواد: ${dynamicFields.materialsScientificName}`);
      }
      if (dynamicFields.hazmatQuantitiesTable) {
        const doc = typeof dynamicFields.hazmatQuantitiesTable === 'object'
          ? (dynamicFields.hazmatQuantitiesTable.name || dynamicFields.hazmatQuantitiesTable.url || 'مرفق جدول كميات المواد الخطرة')
          : dynamicFields.hazmatQuantitiesTable;
        parts.push(`جدول كميات المواد الخطرة: ${doc}`);
      }
      if (dynamicFields.safetyDataSheetMSDS) {
        const doc = typeof dynamicFields.safetyDataSheetMSDS === 'object'
          ? (dynamicFields.safetyDataSheetMSDS.name || dynamicFields.safetyDataSheetMSDS.url || 'مرفق صحيفة السلامة (MSDS)')
          : dynamicFields.safetyDataSheetMSDS;
        parts.push(`صحيفة السلامة (MSDS): ${doc}`);
      }
      if (dynamicFields.alarmFirefightingPlans) {
        const doc = typeof dynamicFields.alarmFirefightingPlans === 'object'
          ? (dynamicFields.alarmFirefightingPlans.name || dynamicFields.alarmFirefightingPlans.url || 'مرفق مخططات الإنذار والإطفاء')
          : dynamicFields.alarmFirefightingPlans;
        parts.push(`مخططات الإنذار والإطفاء: ${doc}`);
      }
      if (dynamicFields.maintenanceCertificate) {
        const doc = typeof dynamicFields.maintenanceCertificate === 'object'
          ? (dynamicFields.maintenanceCertificate.name || dynamicFields.maintenanceCertificate.url || 'مرفق شهادة الصيانة')
          : dynamicFields.maintenanceCertificate;
        parts.push(`شهادة الصيانة: ${doc}`);
      }
      if (dynamicFields.chemicalType) {
        parts.push(`نوع المادة الكيميائية: ${dynamicFields.chemicalType}`);
      }
      break;

    case 'gas_selling_shops_license':
    case 'Gas Selling Shops License':
      if (dynamicFields.moicLetter) {
        const letter = typeof dynamicFields.moicLetter === 'object'
          ? (dynamicFields.moicLetter.name || dynamicFields.moicLetter.url || 'مرفق رسالة وزارة الصناعة والتجارة والسياحة')
          : dynamicFields.moicLetter;
        parts.push(`رسالة من وزارة الصناعة والتجارة والسياحة: ${letter}`);
      } else if (dynamicFields.gasMinistryLetter) {
        parts.push(`رسالة من وزارة الصناعة والتجارة والسياحة: ${dynamicFields.gasMinistryLetter}`);
      }
      break;

    case 'bakery_license':
    case 'Bakery License':
      if (dynamicFields.bakeryCrCopy) {
        const doc = typeof dynamicFields.bakeryCrCopy === 'object'
          ? (dynamicFields.bakeryCrCopy.name || dynamicFields.bakeryCrCopy.url || 'مرفق السجل التجاري')
          : dynamicFields.bakeryCrCopy;
        parts.push(`السجل التجاري: ${doc}`);
      }
      if (dynamicFields.bakerySitePhotos) {
        const doc = typeof dynamicFields.bakerySitePhotos === 'object'
          ? (dynamicFields.bakerySitePhotos.name || dynamicFields.bakerySitePhotos.url || 'مرفق صور الموقع')
          : dynamicFields.bakerySitePhotos;
        parts.push(`صور الموقع: ${doc}`);
      }
      if (dynamicFields.bakeryDrawingsApproval) {
        const doc = typeof dynamicFields.bakeryDrawingsApproval === 'object'
          ? (dynamicFields.bakeryDrawingsApproval.name || dynamicFields.bakeryDrawingsApproval.url || 'مرفق موافقات المخططات')
          : dynamicFields.bakeryDrawingsApproval;
        parts.push(`موافقات المخططات المعمارية والكهربائية والميكانيكية: ${doc}`);
      } else if (dynamicFields.bakeryDrawings) {
        parts.push(`موافقات المخططات المعمارية: ${dynamicFields.bakeryDrawings}`);
      }
      break;

    case 'gold_shop_license':
    case 'Gold Shop License':
      if (dynamicFields.goldAlarmContract) {
        const doc = typeof dynamicFields.goldAlarmContract === 'object'
          ? (dynamicFields.goldAlarmContract.name || dynamicFields.goldAlarmContract.url || 'مرفق عقد الصيانة لأجهزة الإنذار والإطفاء')
          : dynamicFields.goldAlarmContract;
        parts.push(`عقد صيانة أجهزة الإنذار والإطفاء: ${doc}`);
      } else if (dynamicFields.goldAlarmDetails) {
        parts.push(`عقد صيانة نظام الإنذار: ${dynamicFields.goldAlarmDetails}`);
      }
      break;

    case 'gas_station_license':
    case 'Gas Station License':
      if (dynamicFields.gasStationGovApprovals) {
        const doc = typeof dynamicFields.gasStationGovApprovals === 'object'
          ? (dynamicFields.gasStationGovApprovals.name || dynamicFields.gasStationGovApprovals.url || 'مرفق موافقات الجهات الحكومية')
          : dynamicFields.gasStationGovApprovals;
        parts.push(`موافقات من الجهات الحكومية ذات العلاقة: ${doc}`);
      }
      if (dynamicFields.gasStationApplicantLetter) {
        const doc = typeof dynamicFields.gasStationApplicantLetter === 'object'
          ? (dynamicFields.gasStationApplicantLetter.name || dynamicFields.gasStationApplicantLetter.url || 'مرفق رسالة رسمية باسم مقدم الطلب')
          : dynamicFields.gasStationApplicantLetter;
        parts.push(`رسالة رسمية باسم مقدم الطلب: ${doc}`);
      }
      break;

    case 'small_facilities_inspection_certificate':
    case 'Small Facilities Inspection Certificate Renewal':
      if (dynamicFields.leaseContractCopy) {
        const doc = typeof dynamicFields.leaseContractCopy === 'object'
          ? (dynamicFields.leaseContractCopy.name || dynamicFields.leaseContractCopy.url || 'مرفق نسخة من عقد الإيجار')
          : dynamicFields.leaseContractCopy;
        parts.push(`نسخة من عقد الإيجار: ${doc}`);
      }
      if (dynamicFields.detailedSitePlans || dynamicFields.sitePlans) {
        const fileObj = dynamicFields.detailedSitePlans || dynamicFields.sitePlans;
        const doc = typeof fileObj === 'object'
          ? (fileObj.name || fileObj.url || 'مرفق مخططات تفصيلية للموقع')
          : fileObj;
        parts.push(`مخططات تفصيلية للموقع: ${doc}`);
      }
      if (dynamicFields.approvedMaintenanceContract || dynamicFields.maintenanceContract) {
        const fileObj = dynamicFields.approvedMaintenanceContract || dynamicFields.maintenanceContract;
        const doc = typeof fileObj === 'object'
          ? (fileObj.name || fileObj.url || 'مرفق عقد صيانة من شركة معتمدة')
          : fileObj;
        parts.push(`عقد صيانة من شركة معتمدة: ${doc}`);
      }
      if (dynamicFields.inspectionArea) parts.push(`مساحة المنشأة: ${dynamicFields.inspectionArea} متر مربع`);
      break;
  }

  if (dynamicFields.genericDetails) {
    parts.push(`تفاصيل الطلب: ${dynamicFields.genericDetails}`);
  }

  if (parts.length > 0) {
    return parts.join(' | ');
  }

  const fieldLabels = {
    inspectionArea: 'مساحة التفتيش',
    chemicalType: 'نوع المادة الكيميائية',
    moicLetter: 'رسالة من وزارة الصناعة والتجارة والسياحة',
    gasMinistryLetter: 'تفاصيل خطاب وزارة الصناعة',
    bakeryCrCopy: 'نسخة من السجل التجاري',
    bakerySitePhotos: 'صور للموقع',
    bakeryDrawingsApproval: 'موافقات المخططات المعمارية والكهربائية والميكانيكية',
    bakeryDrawings: 'موافقات المخططات المعمارية',
    goldAlarmContract: 'نسخة من عقد الصيانة لأجهزة الإنذار والإطفاء',
    goldAlarmDetails: 'عقد صيانة نظام الإنذار',
    trainingOfficialLetter: 'خطاب رسمي',
    trainingAccreditations: 'الموافقات/الاعتمادات',
    gasStationGovApprovals: 'موافقات من الجهات الحكومية',
    gasStationApplicantLetter: 'رسالة رسمية باسم مقدم الطلب',
    leaseContractCopy: 'نسخة من عقد الإيجار',
    sitePlans: 'مخططات الموقع',
    idCardCopy: 'بطاقة الهوية',
    propertyDeed: 'وثيقة ملكية العقار',
    commercialRegisterCopy: 'نسخة من السجل التجاري',
    tenantLeaseContract: 'عقد الإيجار إذا كان المتضرر مستأجرًا',
    municipalityFormProof: 'استمارة البلدية (أو ما يثبت)',
    engineeringOfficeLetter: 'رسالة المكتب الهندسي',
    projectEngineeringDrawings: 'الرسومات الهندسية للمشروع',
    entityLetter: 'خطاب من الجهة',
    architecturalPlans: 'المخططات المعمارية',
    concernedEntityLetter: 'رسالة من الجهة المعنية',
    otherEntitiesApprovals: 'موافقات الجهات المعنية الأخرى',
    approvedProjectMaps: 'خرائط المشروع المعتمدة',
    electricalMechanicalPlans: 'المخططات الكهربائية والميكانيكية',
    stationCapacity: 'سعة خزانات الوقود',
    trainees: 'المتدربون',
    blueprintNumber: 'رقم المخطط',
    factoryArea: 'مساحة المصنع',
    warehouseType: 'نوع المخزن',
    buildingHeight: 'ارتفاع المبنى',
    floorsCount: 'عدد الطوابق',
    centerName: 'اسم المركز',
    villasCount: 'عدد الفلل',
    complexName: 'اسم المجمع',
    genericDetails: 'تفاصيل الطلب',
    incidentDate: 'تاريخ الحادث',
    facilityName: 'اسم المنشأة',
    location: 'الموقع',
    buildingNumber: 'رقم المبنى',
    electricityAccount: 'حساب الكهرباء',
    buildingType: 'نوع المبنى',
    projectTitle: 'اسم المشروع'
  };

  const fallbackParts = [];
  for (const [key, val] of Object.entries(dynamicFields)) {
    if (val === null || val === undefined || val === '') continue;
    const label = fieldLabels[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    const formattedVal = Array.isArray(val) ? val.join(', ') : (typeof val === 'object' ? (val.name || val.url || JSON.stringify(val)) : val);
    fallbackParts.push(`${label}: ${formattedVal}`);
  }

  return fallbackParts.join(' | ');
}

function buildDynamicFieldsAdminHtml(dynamicFields, serviceName) {
  if (!dynamicFields) return { html: '', display: 'none' };

  let fieldsObj = null;
  if (typeof dynamicFields === 'object' && dynamicFields !== null) {
    fieldsObj = dynamicFields;
  } else if (typeof dynamicFields === 'string') {
    const trimmed = dynamicFields.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        fieldsObj = JSON.parse(trimmed);
      } catch (e) {
        fieldsObj = null;
      }
    }
    if (!fieldsObj) {
      const parts = trimmed.split(/\s*\|\s*/);
      const items = [];
      for (const part of parts) {
        if (!part.trim()) continue;
        const colonIdx = part.indexOf(':');
        if (colonIdx !== -1) {
          const lbl = part.substring(0, colonIdx).trim();
          const val = part.substring(colonIdx + 1).trim();
          items.push({ label: lbl, value: val });
        } else {
          items.push({ label: 'معلومات إضافية', value: part.trim() });
        }
      }
      if (items.length === 0) return { html: '', display: 'none' };

      const renderedItems = items.map(it => {
        const isUrl = it.value.startsWith('http://') || it.value.startsWith('https://') || it.value.startsWith('/uploads/');
        return `
          <div class="info-group">
            <span class="info-label">${escapeHtml(it.label)}</span>
            ${isUrl ? `
              <div style="margin-top: 6px;">
                <a href="${escapeHtml(it.value)}" target="_blank" style="display: inline-flex; align-items: center; gap: 8px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); color: #60a5fa; padding: 8px 16px; border-radius: 10px; text-decoration: none; font-size: 0.88rem; font-weight: 700; transition: all 0.2s ease;">
                  <span>📄</span>
                  <span>معاينة وتحميل المستند المرفق (PDF)</span>
                </a>
              </div>
            ` : `
              <span class="info-value" style="color: #f8fafc; background: rgba(15, 23, 42, 0.7); border: 1px solid #334155; padding: 8px 14px; border-radius: 10px; display: inline-block; margin-top: 4px; font-size: 0.92rem;">${escapeHtml(it.value)}</span>
            `}
          </div>
        `;
      }).join('\n');

      return { html: renderedItems, display: 'block' };
    }
  }

  const fallbackFormatted = formatDynamicFields(serviceName, fieldsObj);
  return buildDynamicFieldsAdminHtml(fallbackFormatted, serviceName);
}

module.exports = {
  masterServiceCatalogMap,
  SERVICES_REGISTRY,
  resolveOfficialServiceName,
  resolveService,
  resolveArabicStatusName,
  formatDynamicFields,
  buildDynamicFieldsAdminHtml,
  escapeHtml
};
