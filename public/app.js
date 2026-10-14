const $=id=>document.getElementById(id);
let state={projects:[],requirements:[],tasks:[],artifacts:[],runs:[],approvals:[],deliveries:[],events:[]};
let selectedProject='', selectedRequirement='', selectedTask='';
$('token').value=sessionStorage.getItem('factory_token')||'';
function notice(message,error=false){const el=$('notification');el.style.display='block';el.className=error?'error':'';el.textContent=message;}
async function api(route,payload){
  const res=await fetch('/api/'+route,{
    method:payload===undefined?'GET':'POST',
    headers:{'content-type':'application/json',...(sessionStorage.getItem('factory_token')?{'authorization':'Bearer '+sessionStorage.getItem('factory_token')}:{})},
    ...(payload===undefined?{}:{body:JSON.stringify(payload)})
  });
  const obj=await res.json();if(!res.ok)throw new Error(obj.error||'Error HTTP '+res.status);return obj;
}
async function action(callback){
  try{await callback();await reload();}catch(e){notice(e.message,true);}
}
function option(select,items,chosen,text){
  select.replaceChildren();
  for(const x of items){const o=document.createElement('option');o.value=x.id;o.textContent=text(x);select.append(o);}
  if(items.some(x=>x.id===chosen))select.value=chosen;
  return select.value||'';
}
function listing(id,lines){
  const el=$(id);el.replaceChildren();
  if(!lines.length){const li=document.createElement('li');li.textContent='Sin registros';el.append(li);return;}
  for(const line of lines){const li=document.createElement('li');li.textContent=line;el.append(li);}
}
function render(){
  selectedProject=option($('project'),state.projects,selectedProject,x=>x.name);
  const reqs=state.requirements.filter(x=>x.projectId===selectedProject);
  selectedRequirement=option($('requirement'),reqs,selectedRequirement,x=>x.title);
  const reqIds=new Set(reqs.map(x=>x.id));
  const tasks=state.tasks.filter(x=>reqIds.has(x.requirementId));
  selectedTask=option($('task'),tasks,selectedTask,x=>x.title+' · '+x.status);
  const taskIds=new Set(tasks.map(x=>x.id));
  const arts=state.artifacts.filter(x=>taskIds.has(x.taskId));
  listing('requirements',reqs.map(x=>x.title));
  listing('tasks',tasks.map(x=>x.title+' ['+x.status+']'));
  listing('artifacts',arts.map(x=>x.source+' · SHA-256 '+x.sha256.slice(0,16)+'…'));
  $('projectInfo').textContent=selectedProject ? reqs.length+' requisitos · '+tasks.length+' tareas · '+arts.length+' evidencias' : 'Crea un proyecto para comenzar';
  const runs=state.runs.filter(x=>x.projectId===selectedProject);
  const last=runs.at(-1), approval=state.approvals.filter(x=>x.projectId===selectedProject).at(-1);
  const report=$('verification');report.replaceChildren();
  if(last){for(const check of last.checks){const p=document.createElement('div');p.className=check.status==='PASS'?'pass':'fail';p.textContent=check.id+' '+check.status+' — '+check.label;report.append(p);}}
  $('gate').textContent='Última prueba: '+(last?(last.passed?'PASS':'FAIL'):'SIN EJECUTAR')+
    ' · Aprobación: '+(approval?'Existe (solo versión vinculada)':'PENDIENTE')+
    ' · Entregas: '+state.deliveries.filter(x=>x.projectId===selectedProject).length;
  $('events').textContent=state.events.slice(-25).reverse().map(x=>x.at+' '+x.type+' '+x.entityId).join('\n')||'Sin eventos.';
}
async function reload(){state=await api('state');render();}
$('connect').onclick=()=>action(async()=>{sessionStorage.setItem('factory_token',$('token').value.trim());await reload();notice('Conexión establecida');});
$('createProject').onsubmit=e=>{e.preventDefault();action(async()=>{const name=e.target.elements.name.value;const p=await api('projects',{name});selectedProject=p.id;e.target.reset();notice('Proyecto creado');});};
$('createRequirement').onsubmit=e=>{e.preventDefault();action(async()=>{await api('requirements',{projectId:selectedProject,title:e.target.elements.title.value});e.target.reset();notice('Requisito creado');});};
$('createTask').onsubmit=e=>{e.preventDefault();action(async()=>{await api('tasks',{requirementId:selectedRequirement,title:e.target.elements.title.value});e.target.reset();notice('Tarea creada');});};
$('attachArtifact').onsubmit=e=>{e.preventDefault();action(async()=>{await api('artifacts',{taskId:selectedTask,source:e.target.elements.source.value,content:e.target.elements.content.value});e.target.reset();notice('Evidencia registrada y resumida mediante SHA-256');});};
$('project').onchange=e=>{selectedProject=e.target.value;selectedRequirement='';selectedTask='';render();};
$('requirement').onchange=e=>{selectedRequirement=e.target.value;render();};
$('task').onchange=e=>{selectedTask=e.target.value;render();};
$('done').onclick=()=>action(async()=>{await api('tasks/complete',{taskId:selectedTask});notice('Tarea terminada');});
$('evaluate').onclick=()=>action(async()=>{const r=await api('evaluate',{projectId:selectedProject});notice('Verificación terminada: '+(r.passed?'7 PASS':'FAIL. Entrega bloqueada'));});
$('approve').onclick=()=>action(async()=>{await api('approve',{projectId:selectedProject,reviewer:$('reviewer').value});notice('Aprobación humana ligada a la versión actual');});
$('deliver').onclick=()=>action(async()=>{await api('deliver',{projectId:selectedProject});notice('Entrega autorizada para la versión verificada');});
$('export').onclick=()=>action(async()=>{const data=await api('export');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='open-factory-export.json';a.click();URL.revokeObjectURL(url);notice('Exportación disponible');});
$('import').onchange=e=>action(async()=>{const f=e.target.files?.[0];if(!f)return;const json=await f.text();const result=await api('import',{json});notice('Importados '+result.projects+' proyectos. Estado: UNVERIFIED.');e.target.value='';});
reload().catch(e=>notice(e.message,true));
