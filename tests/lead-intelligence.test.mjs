import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifyLead,chooseReply,defaultReplyRules} from '../lib/lead-intelligence.ts';

test('Opt-out never creates an outbound reply or marks purchased',()=>{
 const x=qualifyLead({Service:'No thanks'},'STOP please','Rahul');
 assert.equal(x.intent,'not_interested');assert.equal(x.score,0);assert.equal(x.replyDraft,'');
 assert.equal(x.taskKey,'opt_out');assert.notEqual(x.suggestedStatus,'Converted');
 assert.equal(chooseReply('stop messages',defaultReplyRules),null);
});
test('Purchase is a human-confirmation task, not a sale',()=>{
 const x=qualifyLead({Service:'Pro plan',Timeline:'Urgent today'},'I want to buy this plan','Rahul');
 assert.equal(x.intent,'purchase');assert.equal(x.taskKey,'confirm_purchase');
 assert.notEqual(x.suggestedStatus,'Converted');assert.ok(x.nextAction.includes('Human'));
});
test('Callback creates an actionable task',()=>{
 const x=qualifyLead({Service:'Insurance'},'Please call me today','Aman');
 assert.equal(x.intent,'call');assert.equal(x.taskKey,'callback');
 assert.equal(x.suggestedStatus,'Interested');
});
test('Human handoff takes priority over a price enquiry',()=>{
 const rule=chooseReply('Please connect agent for price',defaultReplyRules);
 assert.ok(rule);assert.equal(rule?.handoff,true);
});
test('No rule means no unrequested reply',()=>{
 assert.equal(chooseReply('Hello there',defaultReplyRules),null);
});
test('Form answers influence lead priority without a trained AI model',()=>{
 const x=qualifyLead({Service:'Need this',Budget:'5000',When:'Urgent today',Contact:'Call me',Location:'Ludhiana'},'I want to purchase','Aman');
 assert.equal(x.priority,'Hot');assert.ok(x.score<=100);
});
