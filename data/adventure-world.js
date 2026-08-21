(function(){
"use strict";
const BASE=window.CIZHAN_ADVENTURE;
const parts=window.CIZHAN_WORLD_PARTS||[];
const arcs=parts.map((part)=>part.arc);
const episodes=parts.flatMap((part)=>part.episodes);
const chapters=parts.flatMap((part)=>part.chapters);
const wordPlans=[null];
const nemesisEvents=[null];
parts.forEach((part)=>{
 part.wordPlans.forEach((plan)=>{wordPlans[plan.wordId]=plan;});
 part.nemesisEvents.forEach((event)=>{nemesisEvents[event.wordId]=event;});
});
const sideEvents=chapters.flatMap((chapter)=>chapter.sideEvents||[]);
const nodeById=Object.fromEntries(chapters.flatMap((chapter)=>[...(chapter.nodes||[]),...(chapter.sideEvents||[]).flatMap((event)=>event.nodes||[])].map((node)=>[node.id,node])));
window.CIZHAN_ADVENTURE=Object.assign({},BASE,{arcs,episodes,chapters,chapterById:Object.fromEntries(chapters.map((chapter)=>[chapter.id,chapter])),nodeById,sideEvents,sideById:Object.fromEntries(sideEvents.map((event)=>[event.id,event])),characters:[
 {
  "id": "character-1",
  "name": "米拉",
  "firstArc": 1,
  "role": "调查者与固定同伴"
 },
 {
  "id": "character-2",
  "name": "商人艾德里安",
  "firstArc": 1,
  "role": "北境商人与长期伙伴"
 },
 {
  "id": "character-3",
  "name": "伊利安队长",
  "firstArc": 1,
  "role": "地区关键人物"
 },
 {
  "id": "character-4",
  "name": "领航员赛琳",
  "firstArc": 2,
  "role": "地区关键人物"
 },
 {
  "id": "character-5",
  "name": "凯尔律师",
  "firstArc": 3,
  "role": "地区关键人物"
 },
 {
  "id": "character-6",
  "name": "沃斯议员",
  "firstArc": 3,
  "role": "地区关键人物"
 },
 {
  "id": "character-7",
  "name": "朝圣者伊沃",
  "firstArc": 4,
  "role": "地区关键人物"
 },
 {
  "id": "character-8",
  "name": "塞拉守卫",
  "firstArc": 4,
  "role": "地区关键人物"
 },
 {
  "id": "character-9",
  "name": "木工塔林",
  "firstArc": 5,
  "role": "地区关键人物"
 },
 {
  "id": "character-10",
  "name": "布兰工头",
  "firstArc": 5,
  "role": "地区关键人物"
 },
 {
  "id": "character-11",
  "name": "海盗鲁克",
  "firstArc": 6,
  "role": "地区关键人物"
 },
 {
  "id": "character-12",
  "name": "莱拉上将",
  "firstArc": 6,
  "role": "地区关键人物"
 },
 {
  "id": "character-13",
  "name": "奥林院长",
  "firstArc": 7,
  "role": "地区关键人物"
 },
 {
  "id": "character-14",
  "name": "学者奈尔",
  "firstArc": 7,
  "role": "地区关键人物"
 },
 {
  "id": "character-15",
  "name": "商人纳西尔",
  "firstArc": 8,
  "role": "地区关键人物"
 },
 {
  "id": "character-16",
  "name": "制图师蕾娅",
  "firstArc": 8,
  "role": "地区关键人物"
 },
 {
  "id": "character-17",
  "name": "艾拉公主",
  "firstArc": 9,
  "role": "地区关键人物"
 },
 {
  "id": "character-18",
  "name": "斥候阿莎",
  "firstArc": 10,
  "role": "地区关键人物"
 },
 {
  "id": "character-19",
  "name": "游侠维拉",
  "firstArc": 11,
  "role": "地区关键人物"
 },
 {
  "id": "character-20",
  "name": "档案员",
  "firstArc": 12,
  "role": "地区关键人物"
 }
],wordPlans,nemesisEvents,stats:{"arcs":12,"chapters":60,"mainScenes":360,"sideEvents":120,"sideScenes":240,"totalScenes":600,"plannedWords":1800},wordPlan(id){return wordPlans[id]||{};}});
delete window.CIZHAN_WORLD_PARTS;
})();
