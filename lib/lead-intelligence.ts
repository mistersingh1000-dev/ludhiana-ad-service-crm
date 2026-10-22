export type QualificationAnswers=Record<string,string>;
export type LeadPriority="Hot"|"Warm"|"Cold";
export type Qualification={score:number;priority:LeadPriority;intent:"purchase"|"call"|"pricing"|"appointment"|"information"|"not_interested";suggestedStatus:"New"|"Interested"|"Follow-up";nextAction:string;taskKey:string;followUpHours:number;summary:string;replyDraft:string;reasons:string[]};
const has=(t:string,re:RegExp)=>re.test(t);
export function qualifyLead(answers:QualificationAnswers={},message="",name="Customer"):Qualification{
 const values=Object.entries(answers).filter(([,v])=>String(v||"").trim());
 const text=(message+" "+values.map(([k,v])=>k+": "+v).join(" ")).toLowerCase();
 const optout=has(text,/\b(stop|unsubscribe|not interested|no thanks|wrong number|do not message)\b|नहीं चाहिए|मत भेज|नही चाहिए|nahi chahiye/iu);
 const purchase=!optout&&has(text,/\b(buy|purchase|ready to pay|confirm order|book now|take this plan|enroll now)\b|लेना है|खरीद|payment karna|plan lena/iu);
 const call=has(text,/\b(call me|callback|call back|phone call|contact me|speak to|call)\b|कॉल करो|फोन करो|बात करनी/iu);
 const appointment=has(text,/\b(appointment|consultation|visit|meeting|book a demo)\b|अपॉइंटमेंट|मिलना है/iu);
 const pricing=has(text,/\b(price|pricing|cost|rate|quotation|quote|budget|plan|package|premium|charges)\b|₹|कीमत|कितना|kitna|बजट/iu);
 const urgent=has(text,/\b(urgent|asap|today|tomorrow|immediately|this week)\b|जल्दी|आज|अभी|aaj/iu);
 const interest=!optout&&has(text,/\b(interested|yes|need|want|looking for|send details)\b|चाहिए|जरूरत|chahiye/iu);
 const score=optout?0:Math.min(100,20+Math.min(values.length,5)*6+(purchase?35:0)+(call?18:0)+(urgent?16:0)+(appointment?15:0)+(pricing?9:0)+(interest?12:0));
 const priority:LeadPriority=score>=70?"Hot":score>=40?"Warm":"Cold";
 const intent:Qualification["intent"]=optout?"not_interested":purchase?"purchase":call?"call":appointment?"appointment":pricing?"pricing":"information";
 const nextAction=optout?"Do not contact; respect opt-out.":purchase?"Human agent: confirm order, plan, terms and payment.":call?"Call customer and confirm callback time.":appointment?"Schedule appointment and confirm availability.":pricing?"Send accurate quotation and clarify requirements.":"Ask customer requirements and schedule follow-up.";
 const taskKey=optout?"opt_out":purchase?"confirm_purchase":call?"callback":appointment?"appointment":pricing?"send_quote":"qualify";
 const first=String(name||"Customer").split(" ")[0].slice(0,40);
 const replyDraft=optout?"":purchase?"Hi "+first+", thanks for your interest. Our team will confirm the plan and payment details.":call?"Hi "+first+", please share a convenient callback time.":appointment?"Hi "+first+", please share your preferred appointment time.":pricing?"Hi "+first+", please share your exact requirement and budget so our team can provide the correct price.":"Hi "+first+", thanks for your enquiry. Please tell us what you need and a suitable time to connect.";
 const reasons=[values.length+" form answer(s)",...(purchase?["Buying intent"]:[]),...(call?["Callback requested"]:[]),...(urgent?["Urgent"]:[]),...(pricing?["Price requested"]:[]),...(optout?["Opt-out"]:[])];
 return {score,priority,intent,suggestedStatus:optout?"Follow-up":purchase||call||appointment||pricing||interest?"Interested":"New",nextAction,taskKey,followUpHours:optout?0:priority==="Hot"?1:priority==="Warm"?6:24,summary:values.slice(0,5).map(([k,v])=>k.slice(0,60)+": "+String(v).slice(0,100)).join(" • ")||message.slice(0,250),replyDraft,reasons};
}
export type ReplyRule={id:string;keywords:string[];reply:string;handoff?:boolean};
export const defaultReplyRules:ReplyRule[]=[
{id:"pricing",keywords:["price","pricing","cost","rate","budget","kitna","कीमत","कितना"],reply:"Thanks for asking! Please share your requirement and budget. Our team will confirm the price."},
{id:"appointment",keywords:["appointment","visit","meeting","time","timing"],reply:"Please share your preferred date and time; our team will confirm availability."},
{id:"callback",keywords:["call","callback","phone","कॉल"],reply:"Please share a convenient callback time. A human team member will call you.",handoff:true},
{id:"handoff",keywords:["agent","human","executive","manager","complaint","refund"],reply:"Your request is being handed to a human team member.",handoff:true}
];
export function chooseReply(message:string,rules:ReplyRule[]):ReplyRule|null{
 const lower=message.toLowerCase();
 if(/\b(stop|unsubscribe|opt out|wrong number|not interested)\b|नहीं चाहिए|मत भेज/iu.test(lower))return null;
 // A human handoff rule takes precedence over generic pricing or appointment keywords.
 const available=rules.filter(r=>Array.isArray(r.keywords)&&r.keywords.some(k=>k.trim().length>=2&&lower.includes(k.trim().toLowerCase())));
 return available.find(r=>r.handoff===true)||available[0]||null;
}
