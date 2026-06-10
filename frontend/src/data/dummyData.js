export const CITIES = [
  "Agra","Ahmedabad","Aurangabad","Bangalore","Bangalore-1","Bangalore-2",
  "Bareilly","Belagavi","Bhagalpur","Bhopal","Bhubaneswar","Chandigarh",
  "Chennai","Davanagere","Dhanbad","Dharwad","Durgapur","Faridabad",
  "Firozabad","Ghandinagar","Ghaziabad","Gorakhpur","Gulbarga","Gurgaon",
  "Gurgaon-1","Guwahati","Gwalior","Haridwar","Howrah","Hisar","Hubli",
  "Hyderabad","Indore","Jabalpur","Jaipur","Jamshedpur","Jhansi","Jodhpur",
  "Kanpur","Kharagpur","Kolkata","Kolkata-1","Kota","Lucknow","Ludhiana",
  "Madurai","Mangaluru","Meerut","Mumbai","Mumbai-1","Mundra","Nagpur",
  "Nashik","New Delhi","New Delhi-1","Noida","Patna","Prayagraj","Pune",
  "Pune-1","Raigarh","Raipur","Rajkot","Ranchi","Rudrapur","Singrauli",
  "Siliguri","Sonbhadra","Surat","Vadodara","Varanasi","Vijayawada","Visakhapatnam"
].map((name, i) => ({ id: i + 1, name }));

const MEMBER_POOL = [
  { name: "Rajesh Kumar",    role: "Senior Mover",       exp: "8 yrs",  rating: 4.9, phone: "+91 98101 44321" },
  { name: "Anita Sharma",    role: "Packing Specialist", exp: "5 yrs",  rating: 4.7, phone: "+91 97302 55612" },
  { name: "Vikram Patel",    role: "Logistics Head",     exp: "12 yrs", rating: 4.8, phone: "+91 96443 77890" },
  { name: "Sunita Rao",      role: "Coordinator",        exp: "6 yrs",  rating: 4.6, phone: "+91 95534 22341" },
  { name: "Mohammed Farooq", role: "Fleet Manager",      exp: "9 yrs",  rating: 4.9, phone: "+91 94125 88762" },
  { name: "Priya Singh",     role: "Packing Specialist", exp: "4 yrs",  rating: 4.5, phone: "+91 93016 33453" },
];

export const generateMembers = (cityName) => {
  const seed = cityName.charCodeAt(0) % 3;
  return MEMBER_POOL.slice(seed, seed + 3).map((m, idx) => ({
    ...m,
    id: idx + 1,
    initials: m.name.split(" ").map(w => w[0]).join(""),
    city: cityName,
    joined: "Jan 2022",
    docs: [
      { id: 1, type: "Aadhar Card",      icon: "id",       status: "verified", date: "12 Jan 2024" },
      { id: 2, type: "PAN Card",          icon: "card",     status: "verified", date: "14 Jan 2024" },
      { id: 3, type: "Police Clearance",  icon: "shield",   status: idx === 1 ? "pending" : "verified", date: "05 Feb 2024" },
      { id: 4, type: "Driving Licence",   icon: "car",      status: idx === 2 ? "pending" : "verified", date: "18 Mar 2024" },
    ],
  }));
};

export const ADMIN_DOCS_SAMPLE = [
  { icon: "id",     name: "Rajesh Kumar — Aadhar Card",    sub: "Mumbai · 2 hrs ago"   },
  { icon: "card",   name: "Anita Sharma — PAN Card",        sub: "New Delhi · 5 hrs ago" },
  { icon: "shield", name: "Vikram Patel — Police Clearance",sub: "Pune · 1 day ago"      },
  { icon: "car",    name: "Sunita Rao — Driving Licence",   sub: "Chennai · 2 days ago"  },
];