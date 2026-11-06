import test from 'node:test';
import assert from 'node:assert/strict';
import {commandEntries} from '../src/ui/command.js';
import {searchIndex} from '../src/engine/learning.js';
import {ensureBurmese,burmeseText} from '../src/i18n/core.js';

test('Command search resolves visible studio navigation and page labels in English and Burmese',async()=>{
  await ensureBurmese();
  const destinations=[
    {path:'/atlas',labels:['Concept atlas','Concept map','See how the ideas connect.']},
    {path:'/insights',labels:['Learning insights','My learning insights','Notice what is becoming clearer.']},
    {path:'/glossary',labels:['Formula library','A reference you can reason with.']},
    {path:'/terminology',labels:['Mathematical terminology','Mathematical terminology & usage.']},
  ];
  const entries=commandEntries();
  for(const {path,labels} of destinations)for(const label of labels){
    const translated=burmeseText(label);
    assert.match(translated,/[\u1000-\u109f]/,'The displayed label should have a Burmese translation: '+label);
    for(const query of [label,translated])assert.equal(searchIndex(query,entries)[0]?.path,path,'Search should open the page whose visible label was entered: '+query);
  }
});
