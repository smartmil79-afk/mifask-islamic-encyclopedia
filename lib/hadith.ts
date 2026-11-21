export type HadithCollection = {
  slug: string; name: string; arabic: string; compiler: string; overview: string;
  collectionType: string; readerStatus: "planned" | "in-progress" | "available";
  sourceNotes: string[]; topics: string[];
};
export type HadithRecord = {
  id: string; collectionSlug: string; collectionReference: string; book?: string; chapter?: string;
  narrator?: string; arabicText?: string; translation?: string; translationLanguage?: string;
  translationSource?: string; grading?: string; gradingAttributedTo?: string; sourceEdition?: string;
  sourceUrl?: string; verificationStatus: "unverified" | "source-checked" | "editor-reviewed";
  verifiedBy?: string; verifiedAt?: string; notes?: string;
};
export const hadithCollections: HadithCollection[] = [
 {slug:"bukhari",name:"Sahih al-Bukhari",arabic:"صحيح البخاري",compiler:"Muhammad ibn Isma’il al-Bukhari",overview:"A major collection of Prophetic reports arranged in books and chapters. MIFASK will preserve reference details and source attribution for each imported narration.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Reference numbers can vary by edition.","Narration text and grading must be checked against a traceable source before publication."],topics:["Faith","Worship","Character","Transactions","Knowledge"]},
 {slug:"muslim",name:"Sahih Muslim",arabic:"صحيح مسلم",compiler:"Muslim ibn al-Hajjaj",overview:"A major hadith collection. The reader will record collection references, chapter context, translation attribution and source edition.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Numbering may differ by edition.","Text will be added in verified batches."],topics:["Faith","Worship","Character","Knowledge"]},
 {slug:"abudawud",name:"Sunan Abi Dawud",arabic:"سنن أبي داود",compiler:"Abu Dawud al-Sijistani",overview:"A collection covering a wide range of topics, including worship, conduct and legal matters.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Grading is not assumed to be uniform across the collection.","Grading attribution will be displayed separately from narration text."],topics:["Prayer","Transactions","Family","Adab"]},
 {slug:"tirmidhi",name:"Jamiʿ al-Tirmidhi",arabic:"جامع الترمذي",compiler:"Muhammad ibn Isa al-Tirmidhi",overview:"A collection with chapter headings and transmitted discussions of report grading.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Where grading is shown, the attributed source will be recorded.","Edition and numbering details will be retained."],topics:["Worship","Virtues","Knowledge","Adab"]},
 {slug:"nasai",name:"Sunan al-Nasa’i",arabic:"سنن النسائي",compiler:"Ahmad ibn Shu‘ayb al-Nasa’i",overview:"A collection arranged by subject and chapter, to be presented with source references.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Edition-specific numbering will be noted where relevant."],topics:["Worship","Purification","Prayer","Character"]},
 {slug:"ibnmajah",name:"Sunan Ibn Majah",arabic:"سنن ابن ماجه",compiler:"Muhammad ibn Yazid Ibn Majah",overview:"A collection commonly studied alongside the other major Sunni collections.",collectionType:"Six major collections",readerStatus:"planned",sourceNotes:["Source references and any grading attribution will be preserved."],topics:["Worship","Knowledge","Trials","Adab"]},
 {slug:"malik",name:"Muwattaʾ Malik",arabic:"الموطأ",compiler:"Malik ibn Anas",overview:"An early work preserving reports and practice associated with Madinah, with different recensions and editions.",collectionType:"Early collection",readerStatus:"planned",sourceNotes:["Recension and edition information is important for references."],topics:["Worship","Practice","Transactions","Adab"]},
 {slug:"riyad",name:"Riyad as-Salihin",arabic:"رياض الصالحين",compiler:"Yahya ibn Sharaf al-Nawawi",overview:"A thematic compilation widely read for spiritual guidance and conduct.",collectionType:"Thematic collection",readerStatus:"planned",sourceNotes:["The source collection reference will be recorded alongside any translation attribution."],topics:["Character","Worship","Patience","Duas"]}
];
export const hadithRecords: HadithRecord[] = [];
