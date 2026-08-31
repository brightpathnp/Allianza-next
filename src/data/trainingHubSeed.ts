import { TrainingCountry, TrainingLesson, TrainingQuiz } from '../types/training';
import { collection, doc, setDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const mockCountries: TrainingCountry[] = [
  {
    id: 'country-aus',
    slug: 'australia',
    name: 'Australia',
    flagEmoji: '🇦🇺',
    description: 'Learn the ins and outs of the Australian admissions process, visa requirements, and post-study opportunities.',
    isPublished: true,
  },
  {
    id: 'country-malta',
    slug: 'malta',
    name: 'Malta',
    flagEmoji: '🇲🇹',
    description: 'Master the admissions process for Malta, including visa requirements, language schools, and work rights.',
    isPublished: true,
  }
];

export const mockLessons: TrainingLesson[] = [
  // ... Australia Lessons ...
  {
    id: 'lesson-aus-1',
    slug: 'student-visa-process',
    countryId: 'country-aus',
    title: 'Student Visa Process',
    order: 1,
    estimatedMinutes: 15,
    content: `
# Student Visa Process (Subclass 500)

The Australian Student Visa (Subclass 500) allows international students to live, work, and study in Australia for a maximum of five years, in line with their enrolled course.

## Visa types and eligibility
To be eligible, students must:
- Be of a certain age (usually 6 years or older).
- Be enrolled in a course of study and have a Confirmation of Enrolment (CoE).
- Show evidence of English language skills.
- Hold Overseas Student Health Cover (OSHC).
- Meet health and character requirements.
- Have sufficient funds for the stay.

## Application steps and timeline
1. Apply to a CRICOS-registered institution.
2. Receive a Letter of Offer.
3. Accept the offer and pay the initial tuition deposit and OSHC.
4. Receive the Confirmation of Enrolment (CoE).
5. Create an ImmiAccount and lodge the visa application online.
6. Provide biometrics and complete health examinations if requested.

*Typical processing time: 4 to 8 weeks, depending on the sector and risk rating.*

## Required documents checklist
- Valid Passport
- CoE (Confirmation of Enrolment)
- OSHC Policy Document
- Genuine Student (GS) requirement statement
- Evidence of financial capacity
- English proficiency test results (IELTS, PTE, etc.)
- Academic transcripts and certificates

## Common rejection reasons and how to avoid them
- **Fraudulent documents:** Always verify original documents.
- **Insufficient funds:** Ensure the financial evidence clearly covers living costs, tuition, and travel.
- **Failing the Genuine Student (GS) requirement:** The applicant must demonstrate a clear intent to study and return home (or have a legitimate pathway).

## Post-approval steps
- Check visa grant letter for conditions (e.g., Condition 8105 - Work limitation).
- Book flights and arrange accommodation.
- Attend university orientation.
    `
  },
  {
    id: 'lesson-aus-2',
    slug: 'program-options',
    countryId: 'country-aus',
    title: 'Program Options',
    order: 2,
    estimatedMinutes: 10,
    content: `
# Program Options in Australia

Australia offers a diverse range of educational pathways for international students.

## Undergraduate vs Postgraduate Pathways
- **Undergraduate (Bachelor's Degrees):** Typically 3 years (4 years for Honours). Requires completion of secondary education equivalent to Australian Year 12.
- **Postgraduate (Master's Degrees):** Coursework (1.5 to 2 years) or Research. Requires a recognized Bachelor's degree. 

## Vocational Education and Training (VET) / TAFE
VET courses focus on practical skills for work. TAFE (Technical and Further Education) institutes are government-owned.
- Certificates I to IV, Diplomas, and Advanced Diplomas.
- Great for students seeking trade skills or a pathway into a university degree (articulation agreements).

## English Language Requirements
Thresholds vary by institution and level:
- **VET:** IELTS 5.5 (no band less than 5.0) / PTE 42
- **Undergraduate:** IELTS 6.0 (no band less than 5.5) / PTE 50
- **Postgraduate:** IELTS 6.5 (no band less than 6.0) / PTE 58

## Intakes and Academic Calendar
- **Semester 1:** February/March (Main intake)
- **Semester 2:** July/August
- **Trimesters:** Some universities offer a third intake in November.

## Foundation and Bridging Programs
For students who do not meet direct entry requirements:
- **Foundation Year:** A one-year pre-university program.
- **Diplomas (Pathway):** Often equivalent to the first year of a Bachelor's degree.
    `
  },
  {
    id: 'lesson-aus-3',
    slug: 'work-rights',
    countryId: 'country-aus',
    title: 'Work Rights',
    order: 3,
    estimatedMinutes: 10,
    content: `
# Work Rights in Australia

Working while studying is a major draw for students, but strict rules apply.

## Student work hour limits during study
- International students on a Subclass 500 visa can work up to **48 hours per fortnight** (every two weeks) while their course is in session.
- A fortnight begins on a Monday and ends on the second following Sunday.

## Work rights during semester breaks
- Students can work **unlimited hours** during recognized holiday periods and semester breaks.
- Work cannot commence until the student's course has officially started.

## Post-study work visa options (Subclass 485)
The Temporary Graduate visa (subclass 485) allows graduates to live, study, and work in Australia temporarily.
- **Post-Study Work stream:** For international students who graduate with a higher education degree (Bachelor, Master, or PhD). Typical duration: 2 to 3 years.
- **Graduate Work stream:** For students graduating with skills and qualifications that relate to an occupation on the Medium and Long-term Strategic Skills List (MLTSSL).

## Restrictions and compliance obligations
- Breaching work hour limits can lead to visa cancellation.
- Dependents (spouses) can also work 48 hours per fortnight, unless the primary visa holder is studying a Master's degree or PhD, in which case the dependent has unlimited work rights.
    `
  },
  {
    id: 'lesson-aus-4',
    slug: 'tuition-and-scholarships',
    countryId: 'country-aus',
    title: 'Tuition & Scholarships',
    order: 4,
    estimatedMinutes: 8,
    content: `
# Tuition & Scholarships

Understanding the costs of studying in Australia is critical for proper counseling.

## Average tuition ranges
- **VET / TAFE:** AUD $6,000 to $18,000 per year.
- **Undergraduate (Bachelor):** AUD $20,000 to $45,000 per year.
- **Postgraduate (Master's):** AUD $22,000 to $50,000 per year.
- *Note: Medical and veterinary programs are significantly more expensive.*

## Government scholarships
- **Australia Awards:** Fully funded scholarships for students from developing countries.
- **Destination Australia:** Supports domestic and international students to study in regional Australia (up to $15,000 per year).

## University-specific scholarships
- Most universities offer merit-based scholarships (e.g., 10% to 25% fee reductions for high academic achievers).
- Agents should always check the university's official scholarship portal.

## Cost of Living Estimates
The Australian government requires students to prove they have sufficient funds for living costs.
- The current minimum requirement is approximately **AUD $29,710 per year** for the primary applicant.
- This covers accommodation, groceries, transport, and utilities.
    `
  },
  {
    id: 'lesson-aus-5',
    slug: 'health-and-insurance',
    countryId: 'country-aus',
    title: 'Health & Insurance Requirements',
    order: 5,
    estimatedMinutes: 5,
    content: `
# Health & Insurance Requirements

Overseas Student Health Cover (OSHC) is a mandatory requirement for the Student Visa.

## Mandatory health cover (OSHC)
- Must be purchased for the entire duration of the visa, not just the course duration.
- Approved providers include Bupa, Medibank, Allianz, NIB, and AHM.

## What it covers and what it does not
- **Covers:** Visits to the doctor, some hospital treatment, limited pharmaceuticals, and ambulance cover.
- **Does not cover:** Dental, optical, physiotherapy, or pre-existing conditions (in the first 12 months).

## How agents should guide students
- Ensure the policy start date aligns with the student's arrival date (typically 1 month before course start).
- Explain that maintaining OSHC is a visa condition (Condition 8501).
    `
  },
  {
    id: 'lesson-aus-6',
    slug: 'agent-compliance-and-ethics',
    countryId: 'country-aus',
    title: 'Agent Compliance & Ethics',
    order: 6,
    estimatedMinutes: 12,
    content: `
# Agent Compliance & Ethics

Australian universities are bound by the ESOS Act and the National Code, which directly impact how agents must operate.

## Agent code of conduct
- Agents must act honestly, in good faith, and in the best interests of the student.
- Agents must declare conflicts of interest and not engage in false or misleading advertising.

## What agents can and cannot promise
- **CAN:** Provide information about courses, locations, and application processes.
- **CANNOT:** Guarantee visa approval, guarantee a migration outcome, or guarantee employment in Australia.

## Consumer protection laws (ESOS Act)
- The Education Services for Overseas Students (ESOS) Act protects the rights of international students.
- Includes the Tuition Protection Service (TPS), which ensures students receive a refund or are placed in an alternative course if the provider closes.

## Reporting obligations and record keeping
- Universities monitor agent performance and can terminate agreements if agents breach the National Code.
- Agents must keep accurate records of student counseling and documents submitted.
    `
  },
  
  // ... Malta Lessons ...
  {
    id: 'lesson-malta-1',
    slug: 'malta-history',
    countryId: 'country-malta',
    title: 'Malta History',
    order: 1,
    estimatedMinutes: 12,
    content: `
# Malta History

Malta is an archipelago situated in the heart of the Mediterranean Sea, boasting over 7,000 years of rich, multi-layered history. Due to its strategic location between Europe, North Africa, and the Middle East, it has been conquered, ruled, and influenced by almost every major power in the Mediterranean.

## 1. Prehistoric Era & Megalithic Temples (3600 BC – 2500 BC)
*   **The World's Oldest Structures:** Malta is home to some of the oldest free-standing stone structures on Earth—the Megalithic Temples (including Ġgantija, Ħaġar Qim, and Mnajdra).
*   **Pre-dating Giants:** Built during the Neolithic period, these temples are significantly older than both the Egyptian Pyramids and Stonehenge.
*   **The Hypogeum:** The Hal Saflieni Hypogeum is a prehistoric subterranean burial site carved directly into the rock, dating back to 4000 BC.

![The ancient Megalithic Temples of Malta, older than Stonehenge and the Pyramids of Giza.](/src/assets/images/megalithic_temple_malta_1783245470143.jpg)

## 2. Antiquity: Phoenicians, Carthaginians, Romans & Byzantines (800 BC – 870 AD)
*   **Maritime Traders:** The Phoenicians colonized Malta in the 8th century BC, naming it *Malat* ("safe haven").
*   **Roman Rule (218 BC):** Rome seized Malta during the Second Punic War. Under Roman governance, Malta became a prosperous municipality.
*   **Shipwreck of St. Paul (60 AD):** The Apostle Paul was shipwrecked on the island of Malta (traditionally at St. Paul’s Bay) on his way to trial in Rome. This pivotal event introduced Christianity to the Maltese population.

## 3. Arab Rule & Linguistic Roots (870 AD – 1091 AD)
*   **Islamic Conquest:** The Aghlabid Arabs captured Malta in 870 AD, leaving a profound cultural footprint.
*   **Language Foundations:** The Arabs introduced new agricultural irrigation techniques, citrus fruits, and cotton. Crucially, the Siculo-Arabic dialect spoken during this era formed the syntactic and vocabulary base of the Maltese language, making modern Maltese the only Semitic language written in the Latin alphabet.

## 4. Medieval Period & European Re-integration (1091 AD – 1530 AD)
*   **Norman Conquest (1091 AD):** Count Roger I of Sicily drove out the Arabs, re-integrating Malta into Christian Europe.
*   **Feudal Succession:** Malta went on to be ruled by a succession of European dynasties, including the Swabians, Angevins, and the Crown of Aragon.

## 5. The Knights of St. John & the Great Siege (1530 AD – 1798 AD)
*   **A Symbolic Tribute:** In 1530, Holy Roman Emperor Charles V granted Malta to the Knights Hospitaller (the Order of St. John) in exchange for an annual tribute of one Maltese Falcon.
*   **The Great Siege of 1565:** Under Grand Master Jean Parisot de Valette, 500 Knights and 8,000 Maltese citizens heroically defended the island against an invading Ottoman force of over 30,000 soldiers.
*   **Building Valletta:** Following this miraculous victory, Valletta—the first pre-planned grid city in modern Europe—was constructed and fortified as Malta’s capital city.

![The majestic city and fortifications of Valletta, founded by the Knights of St. John.](https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=800&q=80)

## 6. French Occupation & Napoleon (1798 AD – 1800 AD)
*   **Napoleon's Arrival:** Napoleon Bonaparte occupied Malta in 1798 on his way to Egypt, disbanding the Order of St. John.
*   **Short-lived Reign:** Although Napoleon introduced structural reforms and abolished feudalism, the French looted Maltese churches, triggering a popular rebellion within months.

## 7. British Rule & World War II (1800 AD – 1964 AD)
*   **Strategic Naval Outpost:** The Maltese requested British protection against the French. Malta formally became a British Crown Colony under the Treaty of Paris (1814), serving as a crucial naval base.
*   **The George Cross (1942):** During WWII, Malta suffered heavy bombardment by Italian and German air forces due to its strategic position controlling Allied supply lines. In recognition of the supreme courage and resilience of the Maltese people, King George VI awarded the George Cross to the entire island. This emblem remains proudly displayed on the Maltese flag today.

## 8. Independence, Republic & EU Membership (1964 AD – Present)
*   **Independence (1964):** Malta gained independence from the United Kingdom on September 21, 1964.
*   **The Republic (1974):** Malta became a Republic within the Commonwealth on December 13, 1974.
*   **EU Accession (2004):** Malta joined the European Union on May 1, 2004, and officially adopted the Euro currency in 2008.

---

### Why this matters for Student Recruitment:
Counselors should appreciate Malta's historical background. The blending of British administrative systems (e.g., driving on the left, widespread use of English) with rich Mediterranean, Italianate, and Semitic cultural elements makes Malta a unique, bilingual, and highly welcoming study destination for international students.
    `
  },
  {
    id: 'lesson-malta-2',
    slug: 'malta-country-intro',
    countryId: 'country-malta',
    title: 'Malta Country Intro',
    order: 2,
    estimatedMinutes: 10,
    content: `
# Malta Country Intro

Malta is a fascinating European nation situated in the center of the Mediterranean Sea. Known for its rich history, warm climate, and stunning limestone landscapes, it is also a highly appealing destination for international students seeking high-quality English-medium education in a vibrant, safe, and welcoming environment.

## 1. Key Geography & Location
*   **The Archipelago:** Malta is not just one island, but an archipelago consisting of three main inhabited islands: Malta (the largest), Gozo (more rural and green), and Comino (virtually uninhabited, famous for the Blue Lagoon).
*   **Strategic Hub:** Positioned approximately 80 km (50 miles) south of Sicily, Italy, Malta occupies a central maritime crossroads between Europe and North Africa.
*   **Territory Size:** With a land area of just 316 square kilometers (122 sq miles), Malta is one of the world's smallest and most densely populated countries.

![The crystal clear turquoise waters of the famous Blue Lagoon in Comino, Malta.](https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=800&q=80)

## 2. Demographic Facts
*   **Capital:** Valletta (the smallest capital city in the European Union, a designated UNESCO World Heritage site).
*   **Skyline view:**
![The historic skyline of Valletta, Malta's capital city and a UNESCO World Heritage site.](https://images.unsplash.com/photo-1543872084-c7bd3822856f?auto=format&fit=crop&w=800&q=80)
*   **Population:** Around 535,000 residents, with a diverse international community making up a significant portion of the workforce and student population.
*   **Official Languages:**
    1.  **Maltese:** A Semitic language derived from Siculo-Arabic but written in the Latin alphabet, heavily influenced by Italian, French, and English vocabulary.
    2.  **English:** Widely spoken by virtually the entire population. It is the language of government, business, and higher education.
*   **Religion:** Predominantly Roman Catholic, though freedom of worship is guaranteed and Malta is highly secularized with a multicultural society.

## 3. Climate & Lifestyle
*   **Mediterranean Weather:** Malta enjoys a hot-summer Mediterranean climate with extremely mild winters, warm-to-hot summers, and an outstanding average of over 3,000 hours of sunshine per year.
*   **Island Lifestyle:** The lifestyle is relaxed, outdoors-oriented, and centered around the sea. Swimming, diving, boating, and coastal hiking are accessible nearly year-round.
*   **Safety & Security:** Malta is consistently ranked as one of the safest countries in Europe and the world, with very low rates of violent crime, making it highly attractive to parents of international students.

![A narrow, historic street in Valletta showcasing traditional colorful Maltese wooden balconies.](https://images.unsplash.com/photo-1563212727-466d11be56cc?auto=format&fit=crop&w=800&q=80)

## 4. Currency, Economy & Cost of Living
*   **Currency:** The Euro (€), adopted in 2008.
*   **The Economy:** Malta boasts a high-income, advanced economy driven by services:
    *   **Tourism & Maritime:** Major pillars of the national GDP.
    *   **Financial Services & iGaming:** Malta is a global hub for online gaming, fintech, and digital services.
    *   **Aviation & Pharmaceuticals:** High-tech manufacturing is also highly developed.
*   **Cost of Living:** While accommodation rental costs have risen in recent years (particularly in high-demand areas like Sliema, St. Julian's, and Msida), Malta remains more affordable compared to major cities in the UK, USA, or Australia.

---

### Why this matters for Student Recruitment:
Counselors should leverage Malta’s natural benefits. Being a fully English-speaking, safe, EU member state with a sunny Mediterranean climate and relatively low living costs allows international students to receive top-tier, globally recognized European qualifications while enjoying an unparalleled island lifestyle.
    `
  },
  {
    id: 'lesson-malta-3',
    slug: 'why-choose-malta',
    countryId: 'country-malta',
    title: 'Why Choose Malta',
    order: 3,
    estimatedMinutes: 12,
    content: `
# Why Choose Malta

Malta is rapidly becoming one of Europe's top study-abroad destinations for international students. Combining standard high-quality academic pathways with an exceptional Mediterranean lifestyle, it offers students a unique and rewarding European study experience.

## 1. Fully English-Speaking Nation
*   **No Language Barrier:** As a former British colony, English is one of Malta's two official languages and is spoken fluently by virtually the entire population.
*   **Academic Medium:** All university lectures, textbooks, examinations, and seminars are conducted entirely in English.
*   **English Language Teaching (ELT) Hub:** Malta is world-renowned for its English language schools, attracting hundreds of thousands of EFL (English as a Foreign Language) students every year.

![International students collaborating and learning in an English-medium classroom.](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80)

## 2. Top-Quality, Internationally Recognized Education
*   **European Standards:** Malta’s education system follows the European Bologna Process, ensuring that all degrees are internationally recognized and aligned with the Maltese Qualifications Framework (MQF) and European Qualifications Framework (EQF).
*   **Prestigious Institutions:** Students can choose from the historical public University of Malta, elite vocational colleges like MCAST, and several highly respected private international universities offering British-accredited degrees.

## 3. Gateway to Europe (Schengen Zone Access)
*   **Seamless Travel:** Malta has been a member of the Schengen Area since 2007. 
*   **Freedom of Movement:** International students holding a Maltese student visa or e-Residence permit can travel freely across the other 28 Schengen member countries without needing additional visas. This offers an incredible opportunity to explore Europe during holidays.

## 4. Affordable Living & Tuition Costs
*   **Competitive Fees:** Compared to other English-speaking destinations like the UK, USA, Canada, or Australia, tuition fees in Malta are highly competitive and offer excellent value for money.
*   **Low Living Expenses:** While accommodation costs have increased in central areas, the overall cost of dining, transportation, utilities, and entertainment remains significantly lower than in Northern or Western Europe.
*   **Student Discounts:** Students enjoy subsidized public transport and generous discounts at cultural sites, cinemas, gyms, and restaurants.

## 5. Part-Time Work & Post-Study Career Prospects
*   **Legal Part-Time Work:** Non-EU students in Malta are legally permitted to work part-time (up to 20 hours per week) starting from their 91st day on the island.
*   **Post-Study Work Search Visa:** Upon graduation from an MQF Level 7 (Master's) or Level 8 (PhD) program, students can apply for a Post-Study Work Search Visa allowing them to extend their stay by 6 to 9 months to find professional employment.
*   **Booming Industry Sectors:** Malta's highly advanced economy has high demand for skilled talent in iGaming, Financial Services, Tourism & Hospitality, Aviation, and ICT/Tech.

## 6. Safe, Friendly, and Sunny Environment
*   **Exceptional Safety:** Malta is consistently recognized as one of the safest countries in the world, with extremely low crime rates and a welcoming, warm-hearted local population.
*   **Perfect Weather:** With hot summers, mild winters, and over 300 days of sunshine annually, students can enjoy coastal activities, swimming, and outdoor social events year-round.

![The golden limestone streets of Mdina, Malta's silent, medieval capital.](https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=800&q=80)

## 7. Scenic Coastal Lifestyle
*   **Warm Mediterranean Sea:** With over 300 days of sunshine, students can enjoy Malta's beautiful coastal lagoons and warm Mediterranean waters.
![With over 300 days of sunshine, students can enjoy Malta's beautiful coastal lagoons and warm Mediterranean waters.](https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80)

*   **Breathtaking Nature:** From dramatic cliffs to cozy fishing villages, Malta's natural landscape is rich and spectacular.
![The breathtaking coastal scenery of Popeye Village and sea cliffs on Malta island.](https://images.unsplash.com/photo-1596125160917-a06803730e9d?auto=format&fit=crop&w=800&q=80)

---

### Why this matters for Student Recruitment:
Recruitment agents should highlight that Malta is the ultimate "smart choice" for students who want a British-style education in English, but at a fraction of the cost, accompanied by a vibrant Mediterranean lifestyle and Schengen-wide travel opportunities.
`
  },
  {
    id: 'lesson-malta-4',
    slug: 'tuition-and-scholarships',
    countryId: 'country-malta',
    title: 'Tuition & Scholarships',
    order: 4,
    estimatedMinutes: 8,
    content: `
# Tuition & Scholarships

Malta offers a very competitive cost of education compared to the UK or USA, whilst still delivering instruction entirely in English.

## Average tuition ranges
- **English Language Courses:** €150 to €300 per week, depending on intensity.
- **Undergraduate (Bachelor):** €6,000 to €12,000 per year for non-EU students.
- **Postgraduate (Master's):** €7,000 to €15,000 per year.
- *Note: EU/EEA students often enjoy free tuition at the University of Malta for undergraduate courses.*

![A modern academic institution offering top-tier European qualifications.](https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80)

## Scholarships
- **ENDEAVOUR Scholarships Scheme:** Supported by EU funds, sometimes accessible to international students depending on residency criteria.
- **Malta Arts Scholarships:** For specialized fields.
- **University-Specific:** Many private colleges offer partial bursaries or early-bird discounts for international applicants.

## Cost of Living Estimates
- While traditionally cheap, Malta's rent has increased.
- Students should budget approximately **€700 to €1,000 per month** for living expenses (accommodation, food, transport, and utilities).
- Sharing apartments (flatshares) is the most common way to keep costs down.

![Malta offers highly competitive tuition fees and affordable living compared to other English-speaking nations.](https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80)
    `
  },
  {
    id: 'lesson-malta-5',
    slug: 'health-and-insurance',
    countryId: 'country-malta',
    title: 'Health & Insurance Requirements',
    order: 5,
    estimatedMinutes: 6,
    content: `
# Health & Insurance Requirements

Health insurance is a strict requirement for both the visa application and the e-Residence permit.

## Mandatory health cover
- Non-EU students must have comprehensive health insurance.
- The policy must cover inpatient and outpatient medical care in Malta.
- The coverage limit is usually required to be a minimum of **€100,000**.

![Comprehensive health insurance coverage of at least €100,000 is required for all international students.](https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80)

## Medical Screening
- Students from certain countries are required to undergo medical screening (including a chest X-ray to rule out Tuberculosis) upon arrival in Malta or before applying for their residence permit.
- Agents should check the Identity Malta / Health Ministry list of high-risk TB countries to advise students properly.

![Students from designated high-risk countries must undergo standard medical screenings including chest X-rays.](https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=800&q=80)

## Policy Duration
- The insurance must cover the entire duration of the student's intended stay or the duration of the residence permit they are applying for.
    `
  },
  {
    id: 'lesson-malta-6',
    slug: 'agent-compliance-and-ethics',
    countryId: 'country-malta',
    title: 'Agent Compliance & Ethics',
    order: 6,
    estimatedMinutes: 8,
    content: `
# Agent Compliance & Ethics

Agents promoting Malta must adhere to guidelines set by the Maltese authorities and the educational institutions.

## Malta Further and Higher Education Authority (MFHEA)
- The MFHEA regulates educational standards in Malta. Agents must ensure they are only placing students in MFHEA-accredited institutions.

![Maintaining absolute honesty, ethical standards, and accurate compliance with MFHEA regulations.](https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80)

## Managing Expectations
- **Work Rights:** It is highly unethical (and illegal) to promise students they can work immediately upon arrival. Agents MUST clearly state the 90-day waiting period.
- **Accommodation:** Given the high density of Malta, agents should properly set expectations about apartment sizes and costs.

![Counselors must transparently communicate work rights, costs, and timeline constraints to prospective students.](https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80)

## Identity Malta Guidelines
- Identity Malta is the agency handling visas and residence permits.
- Agents must ensure all documentation submitted is 100% genuine. Fraudulent bank statements will result in immediate refusal and potential bans.
    `
  }
];

export const mockQuizzes: TrainingQuiz[] = [
  // --- AUSTRALIA ---
  {
    id: 'quiz-lesson-aus-1',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-1',
    questions: [
      {
        id: 'aus-1-q1',
        question: 'What is the subclass number of the primary Australian Student Visa?',
        options: ['Subclass 485', 'Subclass 500', 'Subclass 189', 'Subclass 600'],
        correctIndex: 1,
        explanation: 'The Student Visa is Subclass 500.'
      },
      {
        id: 'aus-1-q2',
        question: 'What is the maximum duration of a Subclass 500 Student Visa?',
        options: ['2 years', '3 years', '5 years', 'Unlimited'],
        correctIndex: 2,
        explanation: 'The maximum duration is up to 5 years, in line with the enrolled course.'
      },
      {
        id: 'aus-1-q3',
        question: 'What does "CoE" stand for in the Australian education system?',
        options: ['Certificate of Enrollment', 'Confirmation of Enrolment', 'Course of Excellence', 'Certified Official Document'],
        correctIndex: 1,
        explanation: 'CoE stands for Confirmation of Enrolment.'
      },
      {
        id: 'aus-1-q4',
        question: 'Which system do students use to lodge their visa applications online?',
        options: ['AusVisa', 'ImmiAccount', 'MyGov', 'HomeAffairs portal'],
        correctIndex: 1,
        explanation: 'Visa applications are lodged through ImmiAccount.'
      },
      {
        id: 'aus-1-q5',
        question: 'What is a common reason for student visa rejection that can be avoided by verifying original documents?',
        options: ['Choosing an off-peak flight', 'Fraudulent or unverified documents', 'Applying during a weekend', 'Enrolling in more than one course'],
        correctIndex: 1,
        explanation: 'Always verify original documents to prevent fraudulent submissions.'
      }
    ]
  },
  {
    id: 'quiz-lesson-aus-2',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-2',
    questions: [
      {
        id: 'aus-2-q1',
        question: 'What is the typical duration of a standard Bachelor\'s degree in Australia (without Honours)?',
        options: ['2 years', '3 years', '4 years', '5 years'],
        correctIndex: 1,
        explanation: 'Standard Bachelor degrees are 3 years long.'
      },
      {
        id: 'aus-2-q2',
        question: 'What does "TAFE" stand for in Australia?',
        options: ['Tertiary Academic Foundation Education', 'Technical and Further Education', 'Training and Financial Excellence', 'Technology and Future Engineering'],
        correctIndex: 1,
        explanation: 'TAFE is Government-owned Technical and Further Education.'
      },
      {
        id: 'aus-2-q3',
        question: 'What is the registration system that Australian educational institutions must belong to in order to teach international students?',
        options: ['AQF', 'TEQSA', 'CRICOS', 'ASQA'],
        correctIndex: 2,
        explanation: 'Institutions must be registered on CRICOS (Commonwealth Register of Institutions and Courses for Overseas Students).'
      },
      {
        id: 'aus-2-q4',
        question: 'What is the threshold IELTS score required for most Vocational Education and Training (VET) courses?',
        options: ['IELTS 5.0', 'IELTS 5.5', 'IELTS 6.0', 'IELTS 6.5'],
        correctIndex: 1,
        explanation: 'VET courses usually require an IELTS score of 5.5.'
      },
      {
        id: 'aus-2-q5',
        question: 'Which AQF Level represents a Bachelor\'s Degree?',
        options: ['Level 5', 'Level 6', 'Level 7', 'Level 8'],
        correctIndex: 2,
        explanation: 'A standard Bachelor Degree is AQF Level 7.'
      }
    ]
  },
  {
    id: 'quiz-lesson-aus-3',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-3',
    questions: [
      {
        id: 'aus-3-q1',
        question: 'What is the current maximum number of hours an international student can work per fortnight while their course is in session?',
        options: ['20 hours', '38 hours', '40 hours', '48 hours'],
        correctIndex: 3,
        explanation: 'The fortnightly work limit is 48 hours for student visa holders.'
      },
      {
        id: 'aus-3-q2',
        question: 'When are student visa holders allowed to work unlimited hours?',
        options: ['During exams', 'During recognized course breaks / holidays', 'After the first month', 'On public holidays only'],
        correctIndex: 1,
        explanation: 'Unlimited work rights apply during official school breaks.'
      },
      {
        id: 'aus-3-q3',
        question: 'Which visa allows international graduates to work in Australia after completing their studies?',
        options: ['Subclass 485', 'Subclass 500', 'Subclass 189', 'Subclass 417'],
        correctIndex: 0,
        explanation: 'The Temporary Graduate visa is Subclass 485.'
      },
      {
        id: 'aus-3-q4',
        question: 'What happens if a student visa holder is caught working more than 48 hours per fortnight?',
        options: ['They pay a small fine', 'They receive a warning letter', 'Their visa may be cancelled', 'Nothing, it is not monitored'],
        correctIndex: 2,
        explanation: 'Breaching work hours is a serious offense that can lead to visa cancellation.'
      },
      {
        id: 'aus-3-q5',
        question: 'Can a student begin working as soon as they land in Australia, even if their course has not started?',
        options: ['Yes, unconditionally', 'No, they must wait until their course officially commences', 'Only if they have a written permit', 'Yes, up to 10 hours per week'],
        correctIndex: 1,
        explanation: 'Students cannot start working until their course of study has commenced.'
      }
    ]
  },
  {
    id: 'quiz-lesson-aus-4',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-4',
    questions: [
      {
        id: 'aus-4-q1',
        question: 'Approximately what is the current minimum annual living cost requirement for a single student visa applicant (in AUD)?',
        options: ['AUD $18,000', 'AUD $21,041', 'AUD $29,710', 'AUD $35,000'],
        correctIndex: 2,
        explanation: 'The current financial requirement for living costs is approximately AUD $29,710.'
      },
      {
        id: 'aus-4-q2',
        question: 'Which level of education usually has the highest tuition fees in Australia?',
        options: ['English Language Intensive Courses (ELICOS)', 'Vocational Education (VET)', 'Postgraduate degrees (Master/PhD) in medicine/engineering', 'High School programs'],
        correctIndex: 2,
        explanation: 'Postgraduate professional degrees are generally the most expensive.'
      },
      {
        id: 'aus-4-q3',
        question: 'What is the Australia Awards?',
        options: ['An annual film festival', 'A government-funded scholarship program for international students', 'An athletic competition', 'An agency of the immigration office'],
        correctIndex: 1,
        explanation: 'Australia Awards are prestigious international scholarships funded by the Australian Government.'
      },
      {
        id: 'aus-4-q4',
        question: 'What is a common source of fee reductions for international students?',
        options: ['University merit-based scholarships', 'Public transport discounts', 'Working in retail', 'Filing a local tax return'],
        correctIndex: 0,
        explanation: 'Most universities offer 15% to 30% merit-based scholarship reductions.'
      },
      {
        id: 'aus-4-q5',
        question: 'If a student is bringing a spouse, how much extra must they show in their financial capacity (approximate annual cost)?',
        options: ['AUD $3,000', 'AUD $10,394', 'AUD $15,000', 'AUD $20,000'],
        correctIndex: 1,
        explanation: 'A spouse adds roughly AUD $10,394 per year to the financial demonstration requirement.'
      }
    ]
  },
  {
    id: 'quiz-lesson-aus-5',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-5',
    questions: [
      {
        id: 'aus-5-q1',
        question: 'What does "OSHC" stand for in Australia?',
        options: ['Overseas Student Health Cover', 'Official Student Health Care', 'Overseas Study Health Certificate', 'Operational Student Hospital Coverage'],
        correctIndex: 0,
        explanation: 'OSHC is Overseas Student Health Cover.'
      },
      {
        id: 'aus-5-q2',
        question: 'For what duration must OSHC be purchased by the student?',
        options: ['For the first semester only', 'For 1 year at a time', 'For the entire length of the student visa', 'Only after arriving in Australia'],
        correctIndex: 2,
        explanation: 'OSHC must cover the entire visa duration.'
      },
      {
        id: 'aus-5-q3',
        question: 'Which of the following is typically NOT covered by basic OSHC?',
        options: ['Doctor visits (GP)', 'Ambulance service', 'Dental and optical treatment', 'Some hospital accommodation'],
        correctIndex: 2,
        explanation: 'Basic OSHC does not cover dental, optical, or physiotherapy.'
      },
      {
        id: 'aus-5-q4',
        question: 'Who is responsible for purchasing the OSHC policy?',
        options: ['The Australian Government', 'The student (often assisted by their agent or university)', 'The employer', 'The local embassy'],
        correctIndex: 1,
        explanation: 'The student is responsible, and the policy must be active before the visa is granted.'
      },
      {
        id: 'aus-5-q5',
        question: 'Can a student choose their own OSHC provider, or must they use the university\'s preferred provider?',
        options: ['They must use the university provider', 'They are free to choose any government-approved OSHC provider', 'They must use a provider from their home country', 'Only Allianz is allowed'],
        correctIndex: 1,
        explanation: 'Students can choose any authorized provider, though universities recommend a preferred partner.'
      }
    ]
  },
  {
    id: 'quiz-lesson-aus-6',
    countryId: 'country-aus',
    lessonId: 'lesson-aus-6',
    questions: [
      {
        id: 'aus-6-q1',
        question: 'Which Act governs the delivery of education services to international students in Australia?',
        options: ['The CRICOS Act', 'The AQF Act', 'The ESOS Act', 'The Migration Act'],
        correctIndex: 2,
        explanation: 'The Education Services for Overseas Students (ESOS) Act 2000 protects international students.'
      },
      {
        id: 'aus-6-q2',
        question: 'What is the National Code in Australia?',
        options: ['A set of safety standards for buildings', 'The penal code for criminal law', 'A set of legally binding standards for education providers and their agents', 'A secret postal code'],
        correctIndex: 2,
        explanation: 'The National Code of Practice 2018 sets binding standards for international education.'
      },
      {
        id: 'aus-6-q3',
        question: 'What are education agents strictly prohibited from promising or guaranteeing to prospective students?',
        options: ['Help with accommodation', 'A successful visa outcome or PR pathway', 'The start date of the course', 'Help with airport pickup'],
        correctIndex: 1,
        explanation: 'Agents must never guarantee a visa grant or migration pathway.'
      },
      {
        id: 'aus-6-q4',
        question: 'Under ESOS, what must agents provide to students before they accept an offer?',
        options: ['A free laptop', 'Accurate up-to-date information on tuition fees, course details, and living costs', 'A contract for a part-time job', 'A rental agreement'],
        correctIndex: 1,
        explanation: 'Agents must provide transparent, accurate info about the course and living conditions.'
      },
      {
        id: 'aus-6-q5',
        question: 'What happens if an education agent is found to have acted unethically or in breach of the National Code?',
        options: ['The university can terminate their agency agreement and notify government bodies', 'They get a discount on their next registration', 'Nothing, only the student is responsible', 'They must pay a small tip to the student'],
        correctIndex: 0,
        explanation: 'Universities must terminate agreements with non-compliant or unethical agents under the National Code.'
      }
    ]
  },

  // --- MALTA ---
  {
    id: 'quiz-lesson-malta-1',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-1',
    questions: [
      {
        id: 'malta-1-q1',
        question: 'Which period in Malta\'s history features temples older than Stonehenge and the Giza Pyramids?',
        options: ['The Roman Empire', 'The Neolithic Period', 'The Knights of St. John', 'The British Rule'],
        correctIndex: 1,
        explanation: 'The Megalithic Temples of Malta date back to 3600 BC in the Neolithic Period.'
      },
      {
        id: 'malta-1-q2',
        question: 'What is the Hal Saflieni Hypogeum?',
        options: ['A modern university building', 'An ancient Phoenician lighthouse', 'A prehistoric subterranean burial site carved into rock', 'An underwater volcano'],
        correctIndex: 2,
        explanation: 'The Hal Saflieni Hypogeum is a famous underground prehistoric burial chamber.'
      },
      {
        id: 'malta-1-q3',
        question: 'Under which Grand Master did Malta defend itself in the Great Siege of 1565?',
        options: ['Jean Parisot de Valette', 'Napoleon Bonaparte', 'Paul I of Russia', 'Manoel de Vilhena'],
        correctIndex: 0,
        explanation: 'Valletta is named after Jean Parisot de Valette, who led the defense in 1565.'
      },
      {
        id: 'malta-1-q4',
        question: 'Who fortified Malta and built Valletta as Europe\'s first pre-planned grid city?',
        options: ['The Romans', 'The Phoenicians', 'The Knights of St. John', 'The French'],
        correctIndex: 2,
        explanation: 'The Knights of St. John constructed Valletta as a highly fortified capital city.'
      },
      {
        id: 'malta-1-q5',
        question: 'In what year did Malta gain Independence from British rule?',
        options: ['1798', '1814', '1964', '2004'],
        correctIndex: 2,
        explanation: 'Malta achieved independence on September 21, 1964.'
      }
    ]
  },
  {
    id: 'quiz-lesson-malta-2',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-2',
    questions: [
      {
        id: 'malta-2-q1',
        question: 'What is the capital city of Malta, the smallest capital in the EU?',
        options: ['Sliema', 'St. Julian\'s', 'Valletta', 'Mdina'],
        correctIndex: 2,
        explanation: 'Valletta is the historic capital of Malta.'
      },
      {
        id: 'malta-2-q2',
        question: 'What are the two official languages of Malta?',
        options: ['Maltese and Italian', 'Maltese and French', 'Maltese and English', 'English and Italian'],
        correctIndex: 2,
        explanation: 'Maltese and English are both official languages of Malta.'
      },
      {
        id: 'malta-2-q3',
        question: 'What is the currency used in Malta?',
        options: ['Maltese Lira', 'Euro (€)', 'British Pound (£)', 'US Dollar ($)'],
        correctIndex: 1,
        explanation: 'Malta joined the Eurozone in 2008 and uses the Euro.'
      },
      {
        id: 'malta-2-q4',
        question: 'Which transport network serves as Malta\'s primary public transport option?',
        options: ['Underground Metro', 'Buses', 'Trams', 'Trains'],
        correctIndex: 1,
        explanation: 'Malta does not have a train/tram system; public transport relies on extensive bus networks.'
      },
      {
        id: 'malta-2-q5',
        question: 'Approximately how many residents live in Malta?',
        options: ['150,000', '320,000', '535,000', '1.2 million'],
        correctIndex: 2,
        explanation: 'Malta has a population of around 535,000 people.'
      }
    ]
  },
  {
    id: 'quiz-lesson-malta-3',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-3',
    questions: [
      {
        id: 'malta-3-q1',
        question: 'Malta is a member of which zone, allowing easy travel across 29 European countries?',
        options: ['The Eurozone only', 'The Schengen Area', 'The Commonwealth Realm', 'The UK travel union'],
        correctIndex: 1,
        explanation: 'As a Schengen member, Malta allows visa-free transit to other Schengen states.'
      },
      {
        id: 'malta-3-q2',
        question: 'Which of the following makes Malta highly appealing for international students?',
        options: ['Extremely cold ski resorts', 'It is a fully English-speaking nation with warm Mediterranean climate', 'Free public flights', 'It has zero population'],
        correctIndex: 1,
        explanation: 'English is an official language, making it ideal for international students.'
      },
      {
        id: 'malta-3-q3',
        question: 'What is the name of Malta\'s famous quiet medieval walled city?',
        options: ['Valletta', 'Sliema', 'Mdina', 'Bugibba'],
        correctIndex: 2,
        explanation: 'Mdina is Malta\'s silent, fortified medieval capital.'
      },
      {
        id: 'malta-3-q4',
        question: 'How many islands make up the Maltese archipelago?',
        options: ['One single island', 'Three main islands: Malta, Gozo, and Comino', 'Ten small islets', 'Over fifty islands'],
        correctIndex: 1,
        explanation: 'The inhabited islands are Malta, Gozo, and Comino.'
      },
      {
        id: 'malta-3-q5',
        question: 'How many days of sunshine does Malta enjoy on average per year?',
        options: ['Around 100 days', 'Around 180 days', 'Over 300 days', 'Exactly 365 days'],
        correctIndex: 2,
        explanation: 'Malta enjoys over 300 days of sunshine annually.'
      }
    ]
  },
  {
    id: 'quiz-lesson-malta-4',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-4',
    questions: [
      {
        id: 'malta-4-q1',
        question: 'How do Malta\'s tuition fees compare to those of major destinations like the UK, USA, or Australia?',
        options: ['They are much more expensive', 'They are highly competitive and significantly more affordable', 'They are exactly identical', 'They are completely free for all non-EU students'],
        correctIndex: 1,
        explanation: 'Malta is famous for offering affordable European education.'
      },
      {
        id: 'malta-4-q2',
        question: 'What is the approximate annual cost of living for a student in Malta (covering accommodation and food)?',
        options: ['€3,000 - €5,000', '€8,000 - €12,000', '€20,000 - €25,000', '€30,000+'],
        correctIndex: 1,
        explanation: 'Students typically spend between €8,000 and €12,000 per year on living expenses.'
      },
      {
        id: 'malta-4-q3',
        question: 'Which institution is the leading public vocational college in Malta?',
        options: ['University of Malta', 'MCAST', 'GBS Malta', 'Domain Academy'],
        correctIndex: 1,
        explanation: 'MCAST is Malta College of Arts, Science and Technology, the key vocational provider.'
      },
      {
        id: 'malta-4-q4',
        question: 'Are there scholarships or work-study programs available to help non-EU students in Malta?',
        options: ['No, absolutely none', 'Yes, various institutional scholarships and partial fee discounts are offered', 'Only if they work full-time', 'Yes, funded entirely by the United Nations'],
        correctIndex: 1,
        explanation: 'Many private and public colleges offer merit-based scholarships or payment installations.'
      },
      {
        id: 'malta-4-q5',
        question: 'What is the official European credit transfer framework used by Malta?',
        options: ['ACTS', 'ECTS (European Credit Transfer and Accumulation System)', 'US Credit Hour', 'AQF'],
        correctIndex: 1,
        explanation: 'Malta uses ECTS credits, ensuring high qualification portability across Europe.'
      }
    ]
  },
  {
    id: 'quiz-lesson-malta-5',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-5',
    questions: [
      {
        id: 'malta-5-q1',
        question: 'What is the standard minimum coverage limit required for health insurance when applying for a Malta Student Visa or Residence Permit?',
        options: ['€10,000', '€30,000', '€100,000', '€500,000'],
        correctIndex: 2,
        explanation: 'A minimum medical cover of €100,000 is required for international students.'
      },
      {
        id: 'malta-5-q2',
        question: 'Which medical screening is standard for students from designated high-risk countries upon arrival in Malta?',
        options: ['A dental check-up', 'An eye test', 'A chest X-ray (for Tuberculosis)', 'A hearing test'],
        correctIndex: 2,
        explanation: 'A chest X-ray is required to screen for TB for high-risk nationals.'
      },
      {
        id: 'malta-5-q3',
        question: 'What happens if a student fails the mandatory chest X-ray screening?',
        options: ['They pay a fee and continue studying', 'They must repeat their courses', 'Their residence permit application will be blocked and they will face medical hold', 'Nothing, it is optional'],
        correctIndex: 2,
        explanation: 'TB screening is a critical health requirement; failure prevents permit approval.'
      },
      {
        id: 'malta-5-q4',
        question: 'Does the student health insurance need to cover repatriation expenses?',
        options: ['No, only doctor visits', 'Yes, it must cover full hospitalization and repatriation to their home country', 'Only if they travel by ship', 'Only if requested by their university'],
        correctIndex: 1,
        explanation: 'Insurance policies must include emergency hospitalization and repatriation.'
      },
      {
        id: 'malta-5-q5',
        question: 'How long must the health insurance policy cover?',
        options: ['The first week of classes', 'Only during holidays', 'The entire duration of the student\'s intended stay or residence permit', 'Exactly 12 months, regardless of course length'],
        correctIndex: 2,
        explanation: 'The insurance must cover the entire period of study or residence permit validity.'
      }
    ]
  },
  {
    id: 'quiz-lesson-malta-6',
    countryId: 'country-malta',
    lessonId: 'lesson-malta-6',
    questions: [
      {
        id: 'malta-6-q1',
        question: 'What is the name of the official government agency in Malta that handles visas and residence permits?',
        options: ['Jobsplus', 'Identity Malta (now Identità)', 'MFHEA', 'Malta Enterprise'],
        correctIndex: 1,
        explanation: 'Identità (formerly Identity Malta) manages visas and residence permit cards.'
      },
      {
        id: 'malta-6-q2',
        question: 'What is the legal waiting period before a non-EU student can start working part-time in Malta?',
        options: ['They can work immediately', '30 days', '90 days (working from the 91st day)', 'They can never work'],
        correctIndex: 2,
        explanation: 'Non-EU students can only start working after their 90th day of stay.'
      },
      {
        id: 'malta-6-q3',
        question: 'Which authority regulates further and higher education standards and licensing in Malta?',
        options: ['Identity Malta', 'Jobsplus', 'MFHEA (Malta Further and Higher Education Authority)', 'The local Police'],
        correctIndex: 2,
        explanation: 'The MFHEA is the regulatory body for further and higher education in Malta.'
      },
      {
        id: 'malta-6-q4',
        question: 'What happens if an agent submits a fraudulent bank statement on behalf of a student?',
        options: ['The student gets a discount', 'The application is put on hold for 1 week', 'Immediate visa refusal, student ban, and blacklisting of the agency', 'The agent gets a warning'],
        correctIndex: 2,
        explanation: 'Submitting fraudulent financial evidence is highly illegal and leads to zero-tolerance bans.'
      },
      {
        id: 'malta-6-q5',
        question: 'How many hours per week is a non-EU student allowed to work under the part-time employment permit?',
        options: ['Up to 10 hours', 'Up to 20 hours', 'Up to 30 hours', 'Unlimited hours'],
        correctIndex: 1,
        explanation: 'Students are restricted to a maximum of 20 hours of work per week.'
      }
    ]
  }
];

export async function syncSeedDataToFirestore() {
  try {
    for (const c of mockCountries) {
      await setDoc(doc(db, 'training_countries', c.id), c, { merge: true });
    }
    for (const l of mockLessons) {
      await setDoc(doc(db, 'training_lessons', l.id), l, { merge: true });
    }
    for (const q of mockQuizzes) {
      await setDoc(doc(db, 'training_quizzes', q.id), q, { merge: true });
    }
    console.log("Successfully synced all training modules, lessons, and quizzes to Firestore.");
  } catch (err) {
    console.error("Failed to sync training seed data to Firestore:", err);
  }
}
