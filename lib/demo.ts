export type LeadStatus = "New" | "Contacted" | "Interested" | "Follow-up" | "Converted" | "Lost";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  source: string;
  campaign: string;
  owner: string;
  status: LeadStatus;
  nextFollowUp: string;
  waiting: string;
  value: number;
  createdAt: string;
};

export const leads: Lead[] = [
  { id: "101", name: "Rahul Sharma", phone: "+91 98765 32110", source: "Facebook Lead Ad", campaign: "Insurance - Punjab", owner: "Aman", status: "New", nextFollowUp: "Today, 8:30 PM", waiting: "18 min", value: 18000, createdAt: new Date(Date.now()-0.2*86400000).toISOString() },
  { id: "102", name: "Simran Kaur", phone: "+91 99882 21445", source: "Instagram", campaign: "Bridal Salon Offer", owner: "Neha", status: "Interested", nextFollowUp: "Tomorrow, 11:00 AM", waiting: "6 min", value: 7500, createdAt: new Date(Date.now()-0.8*86400000).toISOString() },
  { id: "103", name: "Arjun Mehta", phone: "+91 98155 70882", source: "Facebook Lead Ad", campaign: "Property Leads", owner: "Aman", status: "Follow-up", nextFollowUp: "Today, 9:00 PM", waiting: "2 hr", value: 125000, createdAt: new Date(Date.now()-1.2*86400000).toISOString() },
  { id: "104", name: "Priya Verma", phone: "+91 98722 11609", source: "WhatsApp", campaign: "Clinic Consultation", owner: "Ritika", status: "Converted", nextFollowUp: "Completed", waiting: "—", value: 2500, createdAt: new Date(Date.now()-2.0*86400000).toISOString() },
  { id: "105", name: "Karan Gill", phone: "+91 99150 77420", source: "Instagram", campaign: "Gym Membership", owner: "Neha", status: "Contacted", nextFollowUp: "11 Oct, 2:30 PM", waiting: "32 min", value: 12000, createdAt: new Date(Date.now()-3.0*86400000).toISOString() },
  { id: "106", name: "Harpreet Singh", phone: "+91 96460 55213", source: "Facebook Lead Ad", campaign: "Solar Leads", owner: "Ritika", status: "Lost", nextFollowUp: "—", waiting: "—", value: 65000, createdAt: new Date(Date.now()-4.0*86400000).toISOString() },
  { id: "107", name: "Mehak Arora", phone: "+91 97790 11837", source: "Website Form", campaign: "Digital Marketing", owner: "Aman", status: "Interested", nextFollowUp: "Today, 8:45 PM", waiting: "47 min", value: 15000, createdAt: new Date(Date.now()-5.0*86400000).toISOString() },
  { id: "108", name: "Nitin Sood", phone: "+91 98144 49006", source: "Facebook Lead Ad", campaign: "Education Course", owner: "Neha", status: "New", nextFollowUp: "Today, 8:20 PM", waiting: "1 hr 12 min", value: 5000, createdAt: new Date(Date.now()-6.0*86400000).toISOString() }
];

export const team = [
  { name: "Aman Verma", role: "Sales Manager", initials: "AV", leads: 48, contacted: 43, won: 12 },
  { name: "Neha Sharma", role: "Sales Agent", initials: "NS", leads: 41, contacted: 35, won: 9 },
  { name: "Ritika Kapoor", role: "Sales Agent", initials: "RK", leads: 37, contacted: 32, won: 8 },
];

export const clients = [
  { company: "GlowUp Salon", owner: "Simran Kaur", plan: "Free", leads: 182, users: 2, status: "Active", expiry: "Included with Ads" },
  { company: "SecureLife Insurance", owner: "Amit Saini", plan: "Pro", leads: 516, users: 6, status: "Active", expiry: "28 Oct 2026" },
  { company: "CarePlus Clinic", owner: "Dr. Mehta", plan: "Growth", leads: 295, users: 4, status: "Active", expiry: "12 Nov 2026" },
  { company: "UrbanNest Realty", owner: "Karan Khanna", plan: "Free", leads: 83, users: 2, status: "Trial", expiry: "16 Oct 2026" }
];
