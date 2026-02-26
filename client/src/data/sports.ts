export interface SportsSection {
  title: string;
  subtitle: string;
}

export interface Stat {
  label: string;
  val: string;
}

export interface SportData {
  id: string;
  name: string;
  subName: string;
  description: string;
  folderPath: string;
  themeColor: string;
  gradient: string;
  features: string[];
  stats: Stat[];
  section1: SportsSection;
  section2: SportsSection;
  detailsSection: {
    title: string;
    description: string;
    imageAlt: string;
  };
  communitySection: {
    title: string;
    description: string;
  };
  joinSection: {
    price: string;
    unit: string;
    perks: string[];
    guarantee: string;
  };
}

export const sportsData: SportData = {
  id: "sports",
  name: "SSRC Sports Club",
  subName: "Where Champions Rise.",
  description: "Elite Training - Team Spirit - Student Excellence",
  folderPath: "/src/assets/football",
  themeColor: "#DC1E26",
  gradient: "linear-gradient(135deg, #DC1E26 0%, #B91820 100%)",
  features: [
    "Professional Coaching",
    "Intra-College Tournaments",
    "Modern Facilities",
  ],
  stats: [
    { label: "Sports", val: "10+" },
    { label: "Athletes", val: "200+" },
    { label: "Trophies", val: "25+" },
  ],
  section1: {
    title: "Sunway Sports Club.",
    subtitle: "Your excellency towards athletics.",
  },
  section2: {
    title: "Power. Precision. Pride.",
    subtitle: "Representing Sunway College Kathmandu on the field.",
  },
  detailsSection: {
    title: "About SSRC Sports Club",
    description:
      "The Sunway Student Representatives Council Sports Club is dedicated to fostering athletic excellence and team spirit among students of Sunway College Kathmandu. We provide comprehensive training programs, organize intra-college tournaments, and create opportunities for students to excel in their chosen sports while maintaining academic excellence.",
    imageAlt: "SSRC Sports Training",
  },
  communitySection: {
    title: "A Community of Champions",
    description:
      "We bring together students passionate about sports, creating a supportive environment where everyone can thrive. From beginners to competitive athletes, SSRC Sports Club welcomes all who share our commitment to excellence and teamwork.",
  },
  joinSection: {
    price: "Free",
    unit: "for students",
    perks: ["Upcoming events", "Early Announcements", "Team management"],
    guarantee:
      "Open to all Sunway College Kathmandu students. Register for upcoming events!",
  },
};
