import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { buildReportData, calendarDate, currentDone, periodBounds, taskDoneWhere, validTitle } from './work-tasks.domain';
import type { ReportDto } from './work-tasks.dto';
import { taskInclude, WorkTasksStore } from './work-tasks.store';
@Injectable()
export class WorkTasksReports {
  constructor(private readonly store:WorkTasksStore){}
  list(userId:string){return this.store.db.workReport.findMany({where:{userId},orderBy:[{updatedAt:'desc'},{id:'asc'}],take:200});}
  async get(userId:string,id:string){const report=await this.store.db.workReport.findFirst({where:{id,userId}});if(!report)throw new NotFoundException('Report not found.');return report;}
  private async validate(userId:string,dto:ReportDto){await this.store.project(this.store.db,userId,dto.projectId);await this.store.objectives(this.store.db,userId,dto.objectiveId?[dto.objectiveId]:[]);periodBounds(dto.from,dto.to,await this.store.zone(userId));}
  save(userId:string,dto:ReportDto,id?:string){return this.store.write(userId,async tx=>{
    if(id&&!await tx.workReport.findFirst({where:{id,userId},select:{id:true}}))throw new NotFoundException('Report not found.');
    if(!id&&await tx.workReport.count({where:{userId}})>=200)throw new BadRequestException('You can keep up to 200 report drafts.');
    await this.store.project(tx,userId,dto.projectId);await this.store.objectives(tx,userId,dto.objectiveId?[dto.objectiveId]:[]);
    const periodStart=calendarDate(dto.from),periodEnd=calendarDate(dto.to);if(periodStart>periodEnd)throw new BadRequestException('Choose an ordered evaluation period.');
    const data={title:validTitle(dto.title),employeeName:dto.employeeName??'',periodStart,periodEnd,summary:dto.summary??'',challenges:dto.challenges??'',lessons:dto.lessons??'',priorities:dto.priorities??'',filters:{projectId:dto.projectId??null,objectiveId:dto.objectiveId??null,category:dto.category??'',status:dto.status??'ALL'}};
    return id?tx.workReport.update({where:{id},data}):tx.workReport.create({data:{...data,userId}});
  });}
  remove(userId:string,id:string){return this.store.write(userId,async tx=>{const result=await tx.workReport.deleteMany({where:{id,userId}});if(!result.count)throw new NotFoundException('Report not found.');return{deleted:true};});}
  async savedPreview(userId:string,id:string){const report=await this.get(userId,id);const filters=report.filters as Record<string,string|null>;return this.preview(userId,{title:report.title,employeeName:report.employeeName,from:report.periodStart.toISOString().slice(0,10),to:report.periodEnd.toISOString().slice(0,10),summary:report.summary,challenges:report.challenges,lessons:report.lessons,priorities:report.priorities,projectId:filters.projectId,objectiveId:filters.objectiveId,category:filters.category??'',status:filters.status??'ALL'});}
  async preview(userId:string,dto:ReportDto){
    await this.validate(userId,dto);const timeZone=await this.store.zone(userId),{start,end}=periodBounds(dto.from,dto.to,timeZone);
    const selected:Prisma.WorkTaskWhereInput={userId,...(dto.projectId?{projectId:dto.projectId}:{}),...(dto.objectiveId?{objectives:{some:{objectiveId:dto.objectiveId}}}:{}),...(dto.category?{category:dto.category}:{})};
    const where:Prisma.WorkTaskWhereInput={AND:[selected,taskDoneWhere,{completedAt:{gte:start,lt:end}},...(dto.status&&dto.status!=='ALL'?[{status:dto.status}]:[])]};
    const[tasks,objectives,followUps]=await Promise.all([
      this.store.db.workTask.findMany({where,include:taskInclude,orderBy:[{completedAt:'asc'},{id:'asc'}],take:501}),
      this.store.db.workObjective.findMany({where:{userId,periodStart:{lte:calendarDate(dto.to)},periodEnd:{gte:calendarDate(dto.from)},...(dto.objectiveId?{id:dto.objectiveId}:{}),...(dto.projectId?{OR:[{projects:{some:{projectId:dto.projectId}}},{tasks:{some:{task:{projectId:dto.projectId}}}}]}:{})},include:{tasks:{where:{task:where},select:{taskId:true}}},orderBy:{periodStart:'asc'}}),
      this.store.db.workFollowUp.findMany({where:{resolvedAt:null,followUpAt:{gte:start,lt:end},task:{...selected,...(dto.status&&dto.status!=='ALL'?{status:dto.status}:{})}},include:{task:{select:{id:true,title:true}}},orderBy:{followUpAt:'asc'},take:501}),
    ]);
    if(tasks.length>500||followUps.length>500)throw new BadRequestException('This report exceeds 500 contributions or follow-ups. Narrow the evaluation period or filters; no records have been silently omitted.');
    const metrics=objectives.map(({tasks,...o})=>({id:o.id,title:o.title,description:o.description,periodStart:o.periodStart,periodEnd:o.periodEnd,successCriteria:o.successCriteria,status:o.status,targetValue:o.targetValue?.toString()??null,actualValue:o.verifiedAt?o.actualValue?.toString()??null:null,metricUnit:o.metricUnit,verifiedAt:o.verifiedAt,verificationEvidence:o.verifiedAt?o.verificationEvidence:'',completedContributions:new Set(tasks.map(t=>t.taskId)).size}));
    return{...buildReportData(tasks,metrics,followUps.map(f=>({id:f.id,taskId:f.taskId,title:f.task.title,followUpAt:f.followUpAt,note:f.note,nextAction:f.nextAction,remindAt:f.remindAt}))),draft:{...dto,title:validTitle(dto.title)},timeZone,generatedAt:new Date().toISOString()};
  }
}
