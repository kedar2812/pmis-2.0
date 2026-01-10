"""
Command to populate India location master data (Country -> State -> District -> City)
Includes all states, UTs, and major districts/cities.
"""
from django.core.management.base import BaseCommand
from masters.models import Country, State, LocationDistrict, City
from django.db import transaction

class Command(BaseCommand):
    help = 'Populates India states, districts and cities'

    def handle(self, *args, **options):
        self.stdout.write('Populating India location data...')

        # Data Structure: State -> District -> [Cities]
        # Source: Consolidated from common administrative data
        INDIA_DATA = {
            "Andhra Pradesh": {
                "Anantapur": ["Anantapur", "Dharmavaram", "Hindupur", "Guntakal"],
                "Chittoor": ["Chittoor", "Tirupati", "Madanapalle"],
                "East Godavari": ["Kakinada", "Rajahmundry", "Amalapuram"],
                "Guntur": ["Guntur", "Tenali", "Narasaraopet"],
                "Krishna": ["Machilipatnam", "Vijayawada", "Gudivada"],
                "Kurnool": ["Kurnool", "Adoni", "Nandyal"],
                "Nellore": ["Nellore", "Kavali", "Gudur"],
                "Prakasam": ["Ongole", "Chirala", "Markapur"],
                "Srikakulam": ["Srikakulam", "Palasa", "Amadalavalasa"],
                "Visakhapatnam": ["Visakhapatnam", "Anakapalle", "Bheemunipatnam"],
                "Vizianagaram": ["Vizianagaram", "Bobbili", "Parvathipuram"],
                "West Godavari": ["Eluru", "Bhimavaram", "Tadepalligudem"],
                "YSR Kadapa": ["Kadapa", "Proddatur", "Rayachoti"],
            },
            "Arunachal Pradesh": {
                "Papum Pare": ["Itanagar", "Naharlagun"],
                "Tawang": ["Tawang"],
                "West Kameng": ["Bomdila"],
            },
            "Assam": {
                "Kamrup Metropolitan": ["Guwahati", "Dispur"],
                "Cachar": ["Silchar"],
                "Dibrugarh": ["Dibrugarh"],
                "Jorhat": ["Jorhat"],
                "Nagaon": ["Nagaon"],
                "Tinsukia": ["Tinsukia"],
            },
            "Bihar": {
                "Patna": ["Patna", "Danapur", "Phulwari Sharif"],
                "Gaya": ["Gaya", "Bodh Gaya"],
                "Bhagalpur": ["Bhagalpur", "Sultanganj"],
                "Muzaffarpur": ["Muzaffarpur"],
                "Purnia": ["Purnia"],
                "Darbhanga": ["Darbhanga"],
            },
            "Chhattisgarh": {
                "Raipur": ["Raipur", "Arang"],
                "Durg": ["Bhilai", "Durg", "Charoda"],
                "Bilaspur": ["Bilaspur"],
                "Korba": ["Korba"],
                "Rajnandgaon": ["Rajnandgaon"],
            },
            "Goa": {
                "North Goa": ["Panaji", "Mapusa", "Bicholim"],
                "South Goa": ["Margao", "Vasco da Gama", "Ponda"],
            },
            "Gujarat": {
                "Ahmedabad": ["Ahmedabad", "Sanand", "Bavla", "Dholka"],
                "Surat": ["Surat", "Bardoli", "Vyara"],
                "Vadodara": ["Vadodara", "Padra", "Karjan"],
                "Rajkot": ["Rajkot", "Gondal", "Jetpur"],
                "Bhavnagar": ["Bhavnagar", "Mahuva", "Palitana"],
                "Jamnagar": ["Jamnagar", "Dhrol"],
                "Gandhinagar": ["Gandhinagar", "Kalol", "Mansa"],
                "Kutch": ["Bhuj", "Gandhidham", "Anjar", "Mandvi"],
            },
            "Haryana": {
                "Gurugram": ["Gurugram", "Sohna", "Pataudi"],
                "Faridabad": ["Faridabad", "Ballabgarh"],
                "Panipat": ["Panipat", "Samalkha"],
                "Ambala": ["Ambala", "Ambala Cantt"],
                "Karnal": ["Karnal", "Nilokheri", "Gharaunda"],
                "Hisar": ["Hisar", "Hansi"],
            },
            "Himachal Pradesh": {
                "Shimla": ["Shimla", "Rampur", "Theog"],
                "Kangra": ["Dharamshala", "Palampur", "Kangra"],
                "Mandi": ["Mandi", "Sundernagar"],
                "Solan": ["Solan", "Baddi", "Nalagarh"],
            },
            "Jharkhand": {
                "Ranchi": ["Ranchi"],
                "East Singhbhum": ["Jamshedpur"],
                "Dhanbad": ["Dhanbad"],
                "Bokaro": ["Bokaro Steel City"],
                "Hazaribagh": ["Hazaribagh"],
            },
            "Karnataka": {
                "Bengaluru Urban": ["Bengaluru", "Yelahanka"],
                "Bengaluru Rural": ["Devanahalli", "Doddaballapura"],
                "Mysuru": ["Mysuru", "Nanjangud", "Hunsur"],
                "Hubballi-Dharwad": ["Hubballi", "Dharwad"],
                "Dakshina Kannada": ["Mangaluru", "Puttur", "Bantwal"],
                "Belagavi": ["Belagavi", "Gokak"],
                "Kalaburagi": ["Kalaburagi"],
                "Ballari": ["Ballari", "Hosapete"],
            },
            "Kerala": {
                "Thiruvananthapuram": ["Thiruvananthapuram", "Neyyattinkara", "Varkala"],
                "Ernakulam": ["Kochi", "Aluva", "Angamaly", "Paravur"],
                "Kozhikode": ["Kozhikode", "Vadakara", "Koyilandy"],
                "Thrissur": ["Thrissur", "Guruvayur", "Chalakudy"],
                "Kannur": ["Kannur", "Thalassery", "Payyanur"],
                "Kollam": ["Kollam", "Punalur"],
            },
            "Madhya Pradesh": {
                "Bhopal": ["Bhopal", "Berasia"],
                "Indore": ["Indore", "Mhow"],
                "Jabalpur": ["Jabalpur"],
                "Gwalior": ["Gwalior"],
                "Ujjain": ["Ujjain", "Nagda"],
            },
            "Maharashtra": {
                "Mumbai City": ["Mumbai", "Colaba", "Dadar"],
                "Mumbai Suburban": ["Bandra", "Andheri", "Borivali", "Kurla"],
                "Pune": ["Pune", "Pimpri-Chinchwad", "Baramati"],
                "Nagpur": ["Nagpur", "Kamptee"],
                "Thane": ["Thane", "Kalyan-Dombivli", "Navi Mumbai (Part)", "Ulhasnagar"],
                "Nashik": ["Nashik", "Malegaon"],
                "Aurangabad": ["Aurangabad"],
                "Solapur": ["Solapur"],
                "Kolhapur": ["Kolhapur", "Ichalkaranji"],
                "Amravati": ["Amravati"],
            },
            "Manipur": {
                "Imphal West": ["Imphal"],
                "Imphal East": ["Porompat"],
            },
            "Meghalaya": {
                "East Khasi Hills": ["Shillong"],
                "West Garo Hills": ["Tura"],
            },
            "Mizoram": {
                "Aizawl": ["Aizawl"],
                "Lunglei": ["Lunglei"],
            },
            "Nagaland": {
                "Kohima": ["Kohima"],
                "Dimapur": ["Dimapur", "Chumukedima"],
            },
            "Odisha": {
                "Khordha": ["Bhubaneswar", "Khordha", "Jatni"],
                "Cuttack": ["Cuttack", "Athagarh"],
                "Ganjam": ["Berhampur", "Chhatrapur"],
                "Sundargarh": ["Rourkela", "Sundargarh"],
                "Sambalpur": ["Sambalpur"],
            },
            "Punjab": {
                "Ludhiana": ["Ludhiana", "Jagraon", "Khanna"],
                "Amritsar": ["Amritsar"],
                "Jalandhar": ["Jalandhar"],
                "Patiala": ["Patiala", "Rajpura"],
                "Bathinda": ["Bathinda"],
                "SAS Nagar": ["Mohali", "Kharar", "Zirakpur"],
            },
            "Rajasthan": {
                "Jaipur": ["Jaipur", "Chomu"],
                "Jodhpur": ["Jodhpur"],
                "Kota": ["Kota"],
                "Udaipur": ["Udaipur"],
                "Ajmer": ["Ajmer", "Kishangarh"],
                "Bikaner": ["Bikaner"],
            },
            "Sikkim": {
                "East Sikkim": ["Gangtok"],
                "South Sikkim": ["Namchi"],
            },
            "Tamil Nadu": {
                "Chennai": ["Chennai"],
                "Coimbatore": ["Coimbatore", "Pollachi", "Mettupalayam"],
                "Madurai": ["Madurai"],
                "Tiruchirappalli": ["Tiruchirappalli"],
                "Salem": ["Salem"],
                "Tirunelveli": ["Tirunelveli"],
                "Erode": ["Erode"],
                "Vellore": ["Vellore"],
                "Kancheepuram": ["Kancheepuram", "Tambaram"],
                "Chengalpattu": ["Chengalpattu"],
            },
            "Telangana": {
                "Hyderabad": ["Hyderabad", "Secunderabad"],
                "Rangareddy": ["L.B. Nagar", "Rajendranagar", "Serilingampally"],
                "Medchal-Malkajgiri": ["Malkajgiri", "Kukatpally", "Uppal", "Medchal"],
                "Warangal Urban": ["Warangal", "Hanamkonda", "Kazipet"],
                "Karimnagar": ["Karimnagar"],
                "Nizamabad": ["Nizamabad"],
                "Khammam": ["Khammam"],
                "Sangareddy": ["Sangareddy", "Patancheru", "Zaheerabad"],
                "Nalgonda": ["Nalgonda", "Miryalaguda"],
                "Mahbubnagar": ["Mahbubnagar"],
            },
            "Tripura": {
                "West Tripura": ["Agartala"],
                "Gomati": ["Udaipur"],
            },
            "Uttar Pradesh": {
                "Lucknow": ["Lucknow"],
                "Kanpur Nagar": ["Kanpur"],
                "Ghaziabad": ["Ghaziabad", "Loni"],
                "Gautam Buddha Nagar": ["Noida", "Greater Noida", "Dadri"],
                "Agra": ["Agra"],
                "Varanasi": ["Varanasi"],
                "Meerut": ["Meerut"],
                "Prayagraj": ["Prayagraj"],
                "Gorakhpur": ["Gorakhpur"],
                "Bareilly": ["Bareilly"],
            },
            "Uttarakhand": {
                "Dehradun": ["Dehradun", "Rishikesh", "Mussoorie"],
                "Haridwar": ["Haridwar", "Roorkee"],
                "Nainital": ["Nainital", "Haldwani", "Ramnagar"],
            },
            "West Bengal": {
                "Kolkata": ["Kolkata"],
                "North 24 Parganas": ["Bidhannagar", "Barasat", "Barrackpore"],
                "Howrah": ["Howrah"],
                "South 24 Parganas": ["Rajpur Sonarpur", "Maheshtala"],
                "Darjeeling": ["Darjeeling", "Siliguri"],
                "Paschim Bardhaman": ["Asansol", "Durgapur"],
            },
            "Delhi": {
                "New Delhi": ["New Delhi", "Connaught Place"],
                "Central Delhi": ["Daryaganj", "Karol Bagh"],
                "North Delhi": ["Sadar Bazar", "Civil Lines"],
                "South Delhi": ["Saket", "Hauz Khas", "Mehrauli"],
                "East Delhi": ["Preet Vihar", "Mayur Vihar"],
                "West Delhi": ["Rajouri Garden", "Patel Nagar", "Punjabi Bagh"],
            },
            "Jammu and Kashmir": {
                "Srinagar": ["Srinagar"],
                "Jammu": ["Jammu"],
                "Anantnag": ["Anantnag"],
                "Baramulla": ["Baramulla"],
            },
             "Ladakh": {
                "Leh": ["Leh"],
                "Kargil": ["Kargil"],
            },
             "Puducherry": {
                "Puducherry": ["Puducherry"],
                "Karaikal": ["Karaikal"],
            },
            "Chandigarh": {
                "Chandigarh": ["Chandigarh"],
            },
        }

        with transaction.atomic():
            # Create India
            india, _ = Country.objects.get_or_create(
                name='India',
                defaults={'code': 'IN', 'dial_code': '+91'}
            )
            self.stdout.write(f'Using Country: {india.name}')

            for state_name, districts_data in INDIA_DATA.items():
                # Create State
                state_code = state_name[:2].upper() # Naive code gen, can be improved
                state, _ = State.objects.get_or_create(
                    country=india,
                    name=state_name,
                    defaults={'code': state_code}
                )
                
                for district_name, cities_list in districts_data.items():
                     # Create District
                    district, _ = LocationDistrict.objects.get_or_create(
                        state=state,
                        name=district_name,
                        defaults={'code': district_name[:3].upper()}
                    )
                    
                    # Create Cities
                    for city_name in cities_list:
                        City.objects.get_or_create(
                            district=district,
                            name=city_name,
                            defaults={'code': city_name[:3].upper()}
                        )
                        
            self.stdout.write(self.style.SUCCESS(f'Successfully populated India locations!'))
            self.stdout.write(f'States: {State.objects.count()}')
            self.stdout.write(f'Districts: {LocationDistrict.objects.count()}')
            self.stdout.write(f'Cities: {City.objects.count()}')
