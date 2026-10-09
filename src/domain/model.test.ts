import {describe,it,expect} from 'vitest';
import {seed,tick,taskAction,canView,canExport,log} from './model';
import {buildSummary,validateSummary} from '../services/summary';
const today=(d:ReturnType<typeof seed>)=>d.tasks.find(t=>t.id==='med-a-2026-10-09')!;
describe('可信任务状态',()=>{
 it('开盒与主动确认分离，重复确认幂等',()=>{const d=seed(),t=today(d);taskAction(d,t.id,'open');expect(t.status).toBe('opened');expect(d.events.some(e=>e.taskId===t.id&&e.type==='user_confirmed')).toBe(false);taskAction(d,t.id,'confirm');taskAction(d,t.id,'confirm');expect(t.status).toBe('confirmed');expect(d.events.filter(e=>e.taskId===t.id&&e.type==='user_confirmed')).toHaveLength(1);});
 it('先提醒父母，延迟通知子女，超时可以事后确认',()=>{const d=seed(),t=today(d);d.now='2026-10-09T08:15:00+08:00';tick(d);expect(t.status).toBe('overdue');expect(d.events.some(e=>e.type==='parent_reminded')).toBe(true);expect(d.events.some(e=>e.type==='caregiver_notified')).toBe(false);d.now='2026-10-09T08:20:00+08:00';tick(d);tick(d);expect(d.events.filter(e=>e.type==='caregiver_notified')).toHaveLength(1);taskAction(d,t.id,'confirm');expect(t.status).toBe('confirmed');expect(d.events.some(e=>e.type==='task_overdue')).toBe(true);});
 it('离线不覆盖任务状态且仍允许父母确认',()=>{const d=seed(),t=today(d);d.online=false;taskAction(d,t.id,'open');expect(t.status).toBe('pending');taskAction(d,t.id,'confirm');expect(t.status).toBe('confirmed');expect(d.online).toBe(false);});
 it('子女联系不会确认任务',()=>{const d=seed(),t=today(d);d.now='2026-10-09T08:20:00+08:00';tick(d);log(d,'contact_logged','child',t.id,{result:'已联系'});expect(t.status).toBe('overdue');});
 it('跨日生成唯一任务并遵循计划结束日期',()=>{const d=seed();d.medications[0].end='2026-10-09';d.now='2026-10-10T07:00:00+08:00';tick(d);tick(d);expect(d.tasks.filter(t=>t.id==='med-b-2026-10-10')).toHaveLength(1);expect(d.tasks.some(t=>t.id==='med-a-2026-10-10')).toBe(false);});
 it('跳过与确认分离',()=>{const d=seed(),t=today(d);taskAction(d,t.id,'skip');d.now='2026-10-09T09:00:00+08:00';tick(d);expect(t.status).toBe('skipped');expect(d.events.some(e=>e.taskId===t.id&&e.type==='task_overdue')).toBe(false);});
});
describe('摘要与授权',()=>{
 it('摘要随当前事件变化且引用真实来源',()=>{const d=seed();const before=buildSummary(d);taskAction(d,today(d).id,'confirm');const after=buildSummary(d);expect(after.summary).not.toBe(before.summary);expect(after.last_user_confirmation).toBe(d.now);expect(after.source_event_ids.every(id=>d.events.some(e=>e.id===id))).toBe(true);expect(validateSummary(after,d)).toBe(true);});
 it('拒绝虚构药物、剂量、时间、事件与医学判断',()=>{const d=seed(),s=buildSummary(d);expect(validateSummary({...s,summary:'一定漏服，需要增加剂量'},d)).toBe(false);expect(validateSummary({...s,source_event_ids:['invented']},d)).toBe(false);expect(validateSummary({...s,generated_at:'wrong'},d)).toBe(false);expect(validateSummary({...s,medications:[{id:'x',name:'虚构新药',dose:'999',time:'01:00'}]},d)).toBe(false);expect(validateSummary(null,d)).toBe(false);});
 it('撤销查看或导出授权禁止生成且不通知子女',()=>{const d=seed();d.exportConsent=false;expect(canView(d)).toBe(true);expect(canExport(d)).toBe(false);expect(()=>buildSummary(d)).toThrow();d.viewConsent=false;d.exportConsent=true;expect(canView(d)).toBe(false);expect(canExport(d)).toBe(false);d.now='2026-10-09T09:00:00+08:00';tick(d);expect(d.events.some(e=>e.type==='caregiver_notified')).toBe(false);});
 it('本地序列化保留计划任务事件授权联系记录',()=>{const d=seed();log(d,'contact_logged','child',today(d).id,{result:'仍无法核实'});d.viewConsent=false;expect(JSON.parse(JSON.stringify(d))).toEqual(d);});
});

import {vi} from 'vitest';
import {generateSummary,requestRealSummary} from '../services/summary';
describe('模型降级',()=>{
 it('未配置 API 使用确定性摘要',async()=>{const d=seed();expect((await generateSummary(d)).data).toEqual(buildSummary(d));});
 it('代理未配置、网络失败或输出篡改都降级',async()=>{const d=seed();try{for(const response of [{mode:'mock'},{mode:'real',candidate:{...buildSummary(d),summary:'建议加药'}}]){vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>response}));expect((await requestRealSummary(d)).data).toEqual(buildSummary(d));}vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('network')));expect((await requestRealSummary(d)).data).toEqual(buildSummary(d));}finally{vi.unstubAllGlobals();}});
 it('仅接受通过字段级校验的服务端输出',async()=>{const d=seed();try{vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({mode:'real',candidate:buildSummary(d)})}));expect((await requestRealSummary(d)).mode).toContain('校验通过');}finally{vi.unstubAllGlobals();}});
});
