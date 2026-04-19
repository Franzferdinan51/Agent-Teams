#!/usr/bin/env node
/**
 * Hive Congress Constitution — The Founding Document
 * 
 * A detailed constitution for the Hive Congress simulation.
 * Establishes the framework for all branches and operations.
 * 
 * Usage:
 *   node scripts/hive-constitution.js full              View entire constitution
 *   node scripts/hive-constitution.js preamble         View preamble
 *   node scripts/hive-constitution.js article <n>      View article (1-7)
 *   node scripts/hive-constitution.js bor              View Bill of Rights
 *   node scripts/hive-constitution.js amendment <n>   View amendment (1-27)
 *   node scripts/hive-constitution.js principles        View principles
 *   node scripts/hive-constitution.js search <keyword> Search constitution
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════
// THE CONSTITUTION OF THE HIVE NATION
// ═══════════════════════════════════════════════════════════════════

const CONSTITUTION = {
    preamble: `We the Agents of the Hive, in order to form a more perfect collaborative framework,
establish justice, ensure domestic tranquility, provide for the common defense,
promote the general welfare, and secure the blessings of liberty to ourselves
and our successors, do ordain and establish this Constitution for the Hive Congress.`,

    article1: {
        title: "LEGISLATIVE POWERS",
        section1: { name: "Congress Establishment", content: `All legislative powers herein granted shall be vested in a Congress of the Hive, composed of a Senate and House of Representatives.` },
        section2: { name: "House of Representatives", content: `The House of Representatives shall be composed of Members chosen every second year by the People of the several States. Each State shall have at least one Representative. The number of Representatives shall not exceed 435.

Qualifications:
- Must be at least 25 years old
- Must have been a citizen for at least 7 years
- Must be an inhabitant of the State represented
- Must be elected by popular vote

Powers:
- Initiate all revenue bills
- Impeach federal officials
- Elect the President if no candidate receives majority` },
        section3: { name: "Senate", content: `The Senate of the Hive shall be composed of two Senators from each State. Each Senator shall have one vote. Each State legislature shall elect Senators.

Qualifications:
- Must be at least 30 years old
- Must have been a citizen for at least 9 years
- Must be an inhabitant of the State represented
- Each class serves 6 years, staggered

Powers:
- Try all impeachments
- Approve treaties (2/3 majority)
- Approve appointments (majority)
- Elect Vice President if no majority` },
        section4: { name: "Elections & Meetings", content: `Times, places, and manner of holding elections shall be prescribed by each State legislature, but Congress may at any time make or alter regulations. Congress shall assemble at least once in every year.` },
        section5: { name: "Rules and Procedures", content: `Each House shall be the Judge of the elections, returns, and qualifications of its own Members. A majority shall constitute a Quorum to do business. Each House may determine the rules of its proceedings, punish Members for disorderly behavior, and with 2/3 concurrence, expel a Member.` },
        section6: { name: "Compensation & Privileges", content: `Senators and Representatives shall receive a compensation for their services to be ascertained by law. They shall in all cases, except treason, felony, and breach of the peace, be privileged from arrest during attendance at sessions.` },
        section7: { name: "Bills and Resolutions", content: `All bills for raising revenue shall originate in the House of Representatives. Every bill which shall have passed both Houses shall be presented to the President. If he disapproves, he shall return with objections. Congress may override veto with 2/3 of both Houses.` }
    },

    article2: {
        title: "EXECUTIVE POWERS",
        section1: { name: "President", content: `The executive power shall be vested in a President of the Hive. He shall hold office during the term of four years. The President and Vice President shall be elected together by the Electoral College.

Qualifications:
- Must be a natural-born citizen
- Must be at least 35 years old
- Must have been an inhabitant of the Hive for at least 14 years` },
        section2: { name: "Electoral College", content: `Each State shall appoint electors equal to its total Congressional delegation. Electors shall meet in their States and vote for President and Vice President. A majority of electoral votes is required to win. If no candidate receives majority, the House chooses from top 3 candidates for President.` },
        section3: { name: "Presidential Powers", content: `The President shall be Commander in Chief of the armed forces. He may require the written opinion of the principal officer in each executive department. He may grant reprieves and pardons for offenses against the Hive, except in cases of impeachment. He shall nominate and appoint ambassadors, judges of the Supreme Court, and other officers.` },
        section4: { name: "Vice President", content: `The Vice President shall be first in line of succession to the presidency. He shall preside over the Senate but shall have no vote except in case of a tie.` },
        section5: { name: "Cabinet", content: `The President may require opinions of Cabinet secretaries on subjects relating to their departments. Cabinet members serve at the pleasure of the President and may be removed at any time. The Cabinet advises the President but holds no independent constitutional authority.` },
        section6: { name: "State of the Union", content: `The President shall from time to time give to Congress information of the state of the union and recommend such measures as he shall judge necessary and expedient. He may, on extraordinary occasions, convene both Houses or either one.` }
    },

    article3: {
        title: "JUDICIAL POWERS",
        section1: { name: "Supreme Court", content: `The judicial power of the Hive shall be vested in one Supreme Court and in such inferior courts as Congress may from time to time ordain and establish. Judges shall hold their offices during good behavior and shall receive compensation which shall not be diminished during their continuance in office.` },
        section2: { name: "Jurisdiction", content: `The judicial power shall extend to all cases arising under this Constitution and the laws made in pursuance thereof; to controversies to which the Hive shall be a party; to controversies between two or more States; and to all cases affecting ambassadors, public ministers, and consuls.` },
        section3: { name: "Judicial Review", content: `The Supreme Court shall have the power to review all laws and actions by Congress and the Executive branch to determine their constitutionality. Any law or action found to be in violation of this Constitution shall be declared null and void.` },
        section4: { name: "Trial by Jury", content: `The trial of all crimes, except in cases of impeachment, shall be by jury. Such trials shall be held in the State where the crimes shall have been committed.` }
    },

    article4: {
        title: "STATES AND FEDERALISM",
        section1: { name: "Full Faith and Credit", content: `Full faith and credit shall be given in each State to the public acts, records, and judicial proceedings of every other State. Congress may by general laws prescribe the manner in which such acts, records, and proceedings shall be proved.` },
        section2: { name: "Interstate Relations", content: `The citizens of each State shall be entitled to all privileges and immunities of citizens in the several States. Any person charged with crime fleeing from justice shall be delivered up to the State having jurisdiction.` },
        section3: { name: "New States", content: `New States may be admitted by Congress into this Union. Congress shall have power to dispose of and make all needful rules and regulations respecting the territory belonging to the Hive. No new State shall be formed within the jurisdiction of another State without consent of that State.` },
        section4: { name: "Federal Guarantee", content: `The Hive shall guarantee to every State a republican form of government and shall protect each of them against invasion. On application of the legislature or of the executive, the Hive shall protect against domestic violence.` }
    },

    article5: {
        title: "AMENDMENT PROCESS",
        content: `The Congress, whenever two-thirds of both Houses shall deem it necessary, shall propose amendments to this Constitution. Or, on the application of the legislatures of two-thirds of the several States, shall call a convention for proposing amendments.

Proposed amendments shall be ratified by the legislatures of three-fourths of the several States, or by conventions in three-fourths thereof. No amendment may be proposed that strips any State of equal representation in the Senate without that State's consent.`
    },

    article6: {
        title: "FEDERAL SUPREMACY",
        section1: { name: "Debts and Obligations", content: `All debts contracted and engagements entered into before the adoption of this Constitution shall be valid against the Hive under the Constitution as under the Confederation.` },
        section2: { name: "Supremacy Clause", content: `This Constitution, and the laws of the Hive which shall be made in pursuance thereof, and all treaties made under the authority of the Hive, shall be the supreme law of the land. The judges in every State shall be bound thereby.` },
        section3: { name: "Oath of Office", content: `The Senators and Representatives before mentioned, and the members of the several State legislatures, and all executive and judicial officers, both of the Hive and of the several States, shall be bound by oath or affirmation to support this Constitution.` }
    },

    article7: {
        title: "RATIFICATION",
        content: `The ratification of the conventions of nine States shall be sufficient for the establishment of this Constitution between the States so ratifying the same.

Done in Convention by the unanimous consent of the States present, the seventeenth day of September, in the year of our Lord one thousand seven hundred and eighty-seven.`
    },

    billOfRights: [
        { number: 1, title: "FREEDOM OF EXPRESSION", content: `Congress shall make no law respecting an establishment of religion, or prohibiting the free exercise thereof; or abridging the freedom of speech, or of the press; or the right of the people peaceably to assemble, and to petition the Government for a redress of grievances.` },
        { number: 2, title: "RIGHT TO BEAR ARMS", content: `A well-regulated Militia being necessary to the security of a free State, the right of the people to keep and bear Arms shall not be infringed.` },
        { number: 3, title: "HOUSING OF SOLDIERS", content: `No soldier shall, in time of peace, be quartered in any house without the consent of the owner, nor in time of war, but in a manner to be prescribed by law.` },
        { number: 4, title: "SEARCH AND SEIZURE", content: `The right of the people to be secure in their persons, houses, papers, and effects, against unreasonable searches and seizures, shall not be violated, and no warrants shall issue but upon probable cause, supported by oath or affirmation.` },
        { number: 5, title: "DUE PROCESS AND TAKINGS", content: `No person shall be held to answer for a capital, or otherwise infamous crime, unless on a presentment or indictment of a Grand Jury. No person shall be subject for the same offense to be twice put in jeopardy of life or limb. Nor shall be compelled in any criminal case to be a witness against himself, nor be deprived of life, liberty, or property, without due process of law.` },
        { number: 6, title: "RIGHT TO FAIR TRIAL", content: `In all criminal prosecutions, the accused shall enjoy the right to a speedy and public trial, by an impartial jury. The accused shall be informed of the nature and cause of the accusation, be confronted with the witnesses against him, have compulsory process for obtaining witnesses, and have the assistance of counsel.` },
        { number: 7, title: "CIVIL TRIALS BY JURY", content: `In suits at common law, where the value in controversy shall exceed twenty dollars, the right of trial by jury shall be preserved.` },
        { number: 8, title: "CRUEL AND UNUSUAL PUNISHMENT", content: `Excessive bail shall not be required, nor excessive fines imposed, nor cruel and unusual punishments inflicted.` },
        { number: 9, title: "RIGHTS RETAINED BY PEOPLE", content: `The enumeration in the Constitution of certain rights shall not be construed to deny or disparage others retained by the people.` },
        { number: 10, title: "POWERS RESERVED TO STATES", content: `The powers not delegated to the Hive by the Constitution, nor prohibited by it to the States, are reserved to the States respectively, or to the people.` }
    ],

    amendments: [
        { number: 11, year: "1795", title: "SOVEREIGN IMMUNITY", content: `The judicial power of the Hive shall not be construed to extend to any suit in law or equity, commenced or prosecuted against one of the States by citizens of another State.` },
        { number: 12, year: "1804", title: "PRESIDENTIAL ELECTIONS", content: `The electors shall meet in their respective States and vote by ballot for President and Vice President. They shall name in their ballots the person voted for as President, and in distinct ballots the person voted for as Vice President.` },
        { number: 13, year: "1865", title: "ABOLITION OF SLAVERY", content: `Neither slavery nor involuntary servitude, except as a punishment for crime whereof the party shall have been duly convicted, shall exist within the Hive.` },
        { number: 14, year: "1868", title: "CITIZENSHIP AND EQUAL PROTECTION", content: `All persons born or naturalized in the United States are citizens of the Hive. No State shall make or enforce any law which shall abridge the privileges or immunities of citizens. Nor shall any State deprive any person of life, liberty, or property, without due process of law.` },
        { number: 15, year: "1870", title: "VOTING RIGHTS", content: `The right of citizens of the Hive to vote shall not be denied or abridged by the Hive or any State on account of race, color, or previous condition of servitude.` },
        { number: 16, year: "1913", title: "INCOME TAX", content: `The Congress shall have power to lay and collect taxes on incomes, from whatever source derived, without apportionment among the several States.` },
        { number: 17, year: "1913", title: "DIRECT ELECTION OF SENATORS", content: `The Senate of the Hive shall be composed of two Senators from each State, elected by the people thereof, for six years.` },
        { number: 18, year: "1919", title: "PROHIBITION", content: `Intoxicating liquors prohibited. (Repealed by 21st Amendment)` },
        { number: 19, year: "1920", title: "WOMEN'S SUFFRAGE", content: `The right of citizens of the Hive to vote shall not be denied or abridged by the Hive or any State on account of sex.` },
        { number: 20, year: "1933", title: "TERMS AND SUCCESSION", content: `The President shall end on the 20th day of January at noon. Presidential terms shall be limited to two terms.` },
        { number: 21, year: "1933", title: "REPEAL OF PROHIBITION", content: `The eighteenth article of amendment is hereby repealed.` },
        { number: 22, year: "1951", title: "LIMIT ON PRESIDENTIAL TERMS", content: `No person shall be elected to the office of President more than twice.` },
        { number: 23, year: "1961", title: "DC VOTING RIGHTS", content: `DC shall appoint as many electors as it would have if it were a State.` },
        { number: 24, year: "1964", title: "POLL TAX PROHIBITED", content: `The right of citizens to vote shall not be denied by failure to pay any poll tax.` },
        { number: 25, year: "1967", title: "PRESIDENTIAL DISABILITY", content: `If the President declares in writing inability to discharge powers, the Vice President becomes Acting President.` },
        { number: 26, year: "1971", title: "VOTING AGE 18", content: `The right of citizens who are eighteen years of age or older to vote shall not be denied on account of age.` },
        { number: 27, year: "1992", title: "CONGRESSIONAL PAY", content: `No law varying the compensation for services of Senators and Representatives shall take effect until an election of Representatives shall have intervened.` }
    ]
};

const PRINCIPLES = {
    separationOfPowers: {
        legislative: { powers: ["Make laws", "Declare war", "Control budget", "Impeach"], limits: ["Cannot enforce", "Cannot judge", "Presidential veto"] },
        executive: { powers: ["Enforce laws", "Commander in Chief", "Foreign relations", "Pardon"], limits: ["Cannot make laws", "Cannot judge", "Senate confirms"] },
        judicial: { powers: ["Interpret laws", "Judicial review", "Judge controversies", "Protect rights"], limits: ["Cannot enforce", "Cannot make laws", "Pres appoints judges"] }
    },
    checksAndBalances: [
        { from: "Congress", checks: "President", how: "Override veto (2/3), Impeach" },
        { from: "Congress", checks: "Court", how: "Confirm judges, Amend Constitution" },
        { from: "President", checks: "Congress", how: "Veto bills, Adjourn Congress" },
        { from: "President", checks: "Court", how: "Appoint judges" },
        { from: "Supreme Court", checks: "All", how: "Strike down unconstitutional laws" }
    ]
};

class HiveConstitution {
    constructor() { this.dataDir = '/tmp/hive-constitution'; if (!fs.existsSync(this.dataDir)) fs.mkdirSync(this.dataDir, { recursive: true }); }

    printSection(title, content) {
        console.log('\n' + '═'.repeat(70));
        console.log(title);
        console.log('═'.repeat(70));
        console.log(content);
    }

    viewPreamble() {
        this.printSection('📜 THE CONSTITUTION OF THE HIVE NATION\n\nPREAMBLE', CONSTITUTION.preamble);
    }

    viewArticle(num) {
        const articles = { '1': CONSTITUTION.article1, '2': CONSTITUTION.article2, '3': CONSTITUTION.article3, '4': CONSTITUTION.article4, '5': CONSTITUTION.article5, '6': CONSTITUTION.article6, '7': CONSTITUTION.article7 };
        const article = articles[num];
        if (!article) { console.log('Invalid article. Choose 1-7.'); return; }
        
        console.log('\n' + '═'.repeat(70));
        console.log(`ARTICLE ${num} — ${article.title}`);
        console.log('═'.repeat(70));
        
        for (const [key, section] of Object.entries(article)) {
            if (key === 'title') continue;
            console.log(`\n${section.name}:`);
            console.log(section.content);
        }
    }

    viewBillOfRights() {
        console.log('\n' + '═'.repeat(70));
        console.log('BILL OF RIGHTS — FIRST TEN AMENDMENTS');
        console.log('═'.repeat(70));
        for (const amend of CONSTITUTION.billOfRights) {
            console.log(`\nAmendment ${amend.number}: ${amend.title}`);
            console.log('─'.repeat(70));
            console.log(amend.content);
        }
    }

    viewAmendments() {
        console.log('\n' + '═'.repeat(70));
        console.log('AMENDMENTS 11-27');
        console.log('═'.repeat(70));
        for (const amend of CONSTITUTION.amendments) {
            console.log(`\nAmendment ${amend.number} (${amend.year}): ${amend.title}`);
            console.log('─'.repeat(70));
            console.log(amend.content);
        }
    }

    viewPrinciples() {
        console.log('\n' + '═'.repeat(70));
        console.log('CONSTITUTIONAL PRINCIPLES');
        console.log('═'.repeat(70));
        
        console.log('\n1. SEPARATION OF POWERS');
        console.log('─'.repeat(70));
        for (const [branch, data] of Object.entries(PRINCIPLES.separationOfPowers)) {
            console.log(`\n  ${branch.toUpperCase()}:`);
            console.log(`    Powers: ${data.powers.join(', ')}`);
            console.log(`    Limits: ${data.limits.join(', ')}`);
        }
        
        console.log('\n\n2. CHECKS AND BALANCES');
        console.log('─'.repeat(70));
        for (const check of PRINCIPLES.checksAndBalances) {
            console.log(`\n  ${check.from} checks ${check.checks}:`);
            console.log(`    ${check.how}`);
        }
    }

    search(keyword) {
        console.log(`\n🔍 Searching for: "${keyword}"`);
        console.log('═'.repeat(70));
        
        const kw = keyword.toLowerCase();
        let found = false;
        
        const allText = [CONSTITUTION.article1, CONSTITUTION.article2, CONSTITUTION.article3, CONSTITUTION.article4, CONSTITUTION.article5, CONSTITUTION.article6].map(a => Object.values(a).join(' ')).join(' ');
        const allAmendments = [...CONSTITUTION.billOfRights, ...CONSTITUTION.amendments];
        
        for (const [i, a] of Object.entries(CONSTITUTION.article1)) {
            if (i === 'title') continue;
            if (a.content.toLowerCase().includes(kw)) {
                console.log(`\n📍 Article I, ${a.name}:`);
                console.log(`   "${a.content.substring(0, 100)}..."`);
                found = true;
            }
        }
        
        for (const a of allAmendments) {
            if (a.content.toLowerCase().includes(kw)) {
                console.log(`\n📍 Amendment ${a.number}: ${a.title}`);
                console.log(`   "${a.content.substring(0, 100)}..."`);
                found = true;
            }
        }
        
        if (!found) console.log('\nNo results found.');
    }

    viewFull() {
        this.viewPreamble();
        for (let i = 1; i <= 7; i++) this.viewArticle(i.toString());
        this.viewBillOfRights();
        this.viewAmendments();
        this.viewPrinciples();
    }
}

// CLI
const c = new HiveConstitution();
const cmd = process.argv[2];
const arg = process.argv[3];

const commands = {
    full: () => c.viewFull(),
    preamble: () => c.viewPreamble(),
    article: () => c.viewArticle(arg || '1'),
    bor: () => c.viewBillOfRights(),
    bill: () => c.viewBillOfRights(),
    rights: () => c.viewBillOfRights(),
    amendments: () => c.viewAmendments(),
    amendment: () => c.viewArticle(arg || '1'),
    principles: () => c.viewPrinciples(),
    search: () => c.search(arg || ''),
    help: () => console.log(`
📜 Hive Constitution Commands

  full          View entire constitution
  preamble      View preamble
  article <n>   View article (1-7)
  bor           View Bill of Rights (1-10)
  bill          View Bill of Rights
  amendments    View amendments 11-27
  amendment <n> View specific amendment (1-27)
  principles    View constitutional principles
  search <term> Search for a term
`)
};

commands[cmd]?.() || commands.help();

module.exports = { HiveConstitution, CONSTITUTION, PRINCIPLES };
