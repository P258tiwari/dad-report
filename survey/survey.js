const questions=[
{q:'What is your current life stage or healthcare need?',type:'radio',options:['Parent to be','Parent / Guardian of a child','Older adult care','Other']},
{q:'On a scale of 1 to 10, how comfortable are your clinic or hospital visits?',type:'range'},
{q:'On a scale of 1 to 10, how convenient is it for you to book a doctor’s appointment?',type:'range'},
{q:'On a scale of 1 to 10, how would you rate your overall experience at clinics and hospitals?',type:'range'},
{q:'How often do you or your family require healthcare services such as check-ups, vaccinations, scans, or consultations?',type:'radio',options:['Very often','Sometimes','Rarely']},
{q:'Do you sometimes miss or forget important healthcare dates such as vaccinations, check-ups, or follow-up visits?',type:'radio',options:['Yes','No','Sometimes']},
{q:'Do healthcare appointments often make you miss office or business hours?',type:'radio',options:['Yes','No','Sometimes']},
{q:'Have you ever faced delays in treatment because medical records were missing or unavailable?',type:'radio',options:['Yes','No']},
{q:'Do you depend on someone else to visit a clinic or hospital?',type:'radio',options:['Yes','No']},
{q:'How much waiting time do you usually experience during clinic or hospital visits?',type:'radio',options:['Less than 15 minutes','15–30 minutes','30–60 minutes','More than 1 hour']},
{q:'How much time do you usually spend travelling to and from clinics and hospitals?',type:'radio',options:['Less than 15 minutes','15–30 minutes','30–60 minutes','More than 1 hour']},
{q:'What are the biggest challenges when seeking national or international medical opinions?',type:'checkbox',options:['Finding the right doctor','Lack of trusted referrals','Difficulty sharing medical records','Communication barriers','High cost','All of these']},
{q:'Would one simple platform for managing your healthcare needs make a meaningful difference?',type:'radio',options:['Yes','No']},
{q:'Would managing your family’s check-ups, vaccines, records, and doctor visits in one place reduce confusion?',type:'radio',options:['Yes','No']},
{q:'Would automated reminders for vaccinations, check-ups, and follow-up visits help your family stay on track?',type:'radio',options:['Yes','No']},
{q:'Would healthcare that fits around your work or business schedule make a real difference?',type:'radio',options:['Yes','No']},
{q:'Would timely reminders help you avoid missing an important vaccination or check-up?',type:'radio',options:['Yes','No']},
{q:'Would you use healthcare services that work around your daily routine?',type:'radio',options:['Yes','No']},
{q:'Would faster access to your health history help doctors provide more accurate treatment?',type:'radio',options:['Yes','No']},
{q:'Would you value access to healthcare from home without depending on someone else?',type:'radio',options:['Yes','No']},
{q:'Would admin support for appointments and waiting times improve your experience?',type:'radio',options:['Yes','No']},
{q:'Would consulting trusted doctors from home help you save meaningful travel time?',type:'radio',options:['Yes','No']},
{q:'Would easier access to expert medical opinions without travel or paperwork be valuable?',type:'radio',options:['Yes','No']}
];

const list=document.getElementById('question-list');
questions.forEach((item,index)=>{
  const wrapper=document.createElement('div');wrapper.className='question';
  const number=document.createElement('span');number.className='question-index';number.textContent=`QUESTION ${String(index+1).padStart(2,'0')} OF ${questions.length}`;
  const title=document.createElement('span');title.className='question-title';title.innerHTML=`${item.q} <span class="required">*</span>`;
  wrapper.append(number,title);
  if(item.type==='range'){
    const rangeWrap=document.createElement('div');rangeWrap.className='range-wrap';
    const input=document.createElement('input');input.type='range';input.min='1';input.max='10';input.value='6';input.name=`question_${index+1}`;
    const value=document.createElement('span');value.className='range-value';value.textContent='6';input.addEventListener('input',()=>value.textContent=input.value);
    rangeWrap.append(input,value);wrapper.append(rangeWrap);
  }else{
    const options=document.createElement('span');options.className='options';
    item.options.forEach(option=>{const label=document.createElement('label');const input=document.createElement('input');input.type=item.type;input.name=item.type==='checkbox'?`question_${index+1}[]`:`question_${index+1}`;input.value=option;if(item.type==='radio'&&option===item.options[0])input.required=true;label.append(input,document.createTextNode(option));options.append(label)});
    wrapper.append(options);
  }
  list.append(wrapper);
});

const details=document.getElementById('details-step');
const questionStep=document.getElementById('questions-step');
const status=document.getElementById('survey-status');
const progress=document.getElementById('survey-progress-bar');
const progressContainer=progress.closest('[role="progressbar"]');
const setProgress=value=>{progress.style.width=`${value}%`;progressContainer?.setAttribute('aria-valuenow',String(Math.round(value)))};
const setStep=(step)=>{const questionsActive=step==='questions';details.classList.toggle('active',!questionsActive);questionStep.classList.toggle('active',questionsActive);status.textContent=questionsActive?'Step 2 of 2 · Your experience':'Step 1 of 2 · About you';setProgress(questionsActive?52:8);window.scrollTo({top:0,behavior:'smooth'})};
document.querySelector('.next-button').addEventListener('click',()=>{const invalid=details.querySelector(':invalid');if(invalid){invalid.reportValidity();return}setStep('questions')});
document.querySelector('.back-button').addEventListener('click',()=>setStep('details'));
document.getElementById('survey-form').addEventListener('input',()=>{if(!questionStep.classList.contains('active'))return;const answered=new Set([...questionStep.querySelectorAll('input:checked,input[type=range]')].map(input=>input.name.replace('[]',''))).size;setProgress(52+(answered/questions.length)*46)});
document.getElementById('survey-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.checkValidity()){form.reportValidity();return}
  const submitButton=form.querySelector('button[type="submit"]');
  submitButton.disabled=true;
  const data={};
  new FormData(form).forEach((value,key)=>{
    const name=key.replace('[]','');
    if(key.endsWith('[]')){(data[name]=data[name]||[]).push(value)}else{data[name]=value}
  });
  try{
    const res=await fetch('/api/survey',{method:'POST',body:JSON.stringify(data)});
    const result=await res.json();
    if(!res.ok||!result.ok)throw new Error(result.error||'Submission failed');
    questionStep.classList.remove('active');
    document.getElementById('survey-success').hidden=false;
    status.textContent='Complete · Thank you';
    setProgress(100);
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(err){
    status.textContent=`Something went wrong: ${err.message}`;
    submitButton.disabled=false;
  }
});
