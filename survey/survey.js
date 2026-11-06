const questions = [
  {
    q: 'Which best describes your healthcare needs right now?',
    type: 'radio',
    options: ['Expecting a baby', 'Parent or guardian of a child', 'Caring for an older adult', 'Other'],
  },
  { q: 'From 1 to 10, how comfortable are your visits to clinics and hospitals?', type: 'range' },
  { q: 'From 1 to 10, how easy is it to book a doctor’s appointment?', type: 'range' },
  { q: 'From 1 to 10, how would you rate your overall experience at clinics and hospitals?', type: 'range' },
  {
    q: 'How often do you or your family need check-ups, vaccinations, scans, or doctor visits?',
    type: 'radio',
    options: ['Often', 'Sometimes', 'Rarely'],
  },
  {
    q: 'Do you forget important health dates, such as vaccinations, check-ups, or follow-up visits?',
    type: 'radio',
    options: ['Yes', 'No', 'Sometimes'],
  },
  {
    q: 'Do doctor visits make you miss work or business hours?',
    type: 'radio',
    options: ['Yes', 'No', 'Sometimes'],
  },
  {
    q: 'Has your treatment ever been delayed because medical records were missing?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Do you need someone else’s help to visit a clinic or hospital?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'How long do you usually wait at a clinic or hospital?',
    type: 'radio',
    options: ['Less than 15 minutes', '15–30 minutes', '30–60 minutes', 'More than 1 hour'],
  },
  {
    q: 'How long do you usually spend traveling to and from a clinic or hospital?',
    type: 'radio',
    options: ['Less than 15 minutes', '15–30 minutes', '30–60 minutes', 'More than 1 hour'],
  },
  {
    q: 'What makes it hard to get a medical opinion from a doctor in another city or country?',
    type: 'checkbox',
    options: [
      'Finding the right doctor',
      'No trusted referrals',
      'Sharing medical records',
      'Language or communication',
      'High cost',
      'All of these',
    ],
  },
  {
    q: 'Would one app for managing your healthcare make a real difference for you?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would it be easier to keep your family’s check-ups, vaccinations, records, and doctor visits together?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would reminders for vaccinations, check-ups, and follow-up visits help your family?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would healthcare that fits around your work schedule help you?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would a reminder help you avoid missing a vaccination or check-up?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would you use healthcare services that fit your daily routine?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Do you think quick access to your health history would help doctors treat you better?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would you like to get healthcare at home without needing someone else’s help?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would help from a support team with appointments and waiting times improve your experience?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would talking to a trusted doctor from home save you travel time?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
  {
    q: 'Would it help to get an expert medical opinion without travel or paperwork?',
    type: 'radio',
    options: ['Yes', 'No'],
  },
];

const list = document.getElementById('question-list');
questions.forEach((item, index) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'question';
  const number = document.createElement('span');
  number.className = 'question-index';
  number.textContent = `QUESTION ${String(index + 1).padStart(2, '0')} OF ${questions.length}`;
  const title = document.createElement('span');
  title.className = 'question-title';
  const required = document.createElement('span');
  required.className = 'required';
  required.textContent = '*';
  title.append(item.q, ' ', required);
  wrapper.append(number, title);
  if (item.type === 'range') {
    const rangeWrap = document.createElement('div');
    rangeWrap.className = 'range-wrap';
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '1';
    input.max = '10';
    input.value = '6';
    input.name = `question_${index + 1}`;
    const value = document.createElement('span');
    value.className = 'range-value';
    value.textContent = '6';
    input.addEventListener('input', () => (value.textContent = input.value));
    rangeWrap.append(input, value);
    wrapper.append(rangeWrap);
  } else {
    const options = document.createElement('span');
    options.className = 'options';
    item.options.forEach((option) => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = item.type;
      input.name = item.type === 'checkbox' ? `question_${index + 1}[]` : `question_${index + 1}`;
      input.value = option;
      if (item.type === 'radio' && option === item.options[0]) input.required = true;
      label.append(input, document.createTextNode(option));
      options.append(label);
    });
    wrapper.append(options);
  }
  list.append(wrapper);
});

const details = document.getElementById('details-step');
const questionStep = document.getElementById('questions-step');
const status = document.getElementById('survey-status');
const progress = document.getElementById('survey-progress-bar');
const progressContainer = progress.closest('[role="progressbar"]');
const setProgress = (value) => {
  progress.style.width = `${value}%`;
  progressContainer?.setAttribute('aria-valuenow', String(Math.round(value)));
};
const setStep = (step) => {
  const questionsActive = step === 'questions';
  details.classList.toggle('active', !questionsActive);
  questionStep.classList.toggle('active', questionsActive);
  status.textContent = questionsActive ? 'Step 2 of 2 · Your experience' : 'Step 1 of 2 · About you';
  setProgress(questionsActive ? 52 : 8);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
document.querySelector('.next-button').addEventListener('click', () => {
  const invalid = details.querySelector(':invalid');
  if (invalid) {
    invalid.reportValidity();
    return;
  }
  setStep('questions');
});
document.querySelector('.back-button').addEventListener('click', () => setStep('details'));
document.getElementById('survey-form').addEventListener('input', () => {
  if (!questionStep.classList.contains('active')) return;
  const answered = new Set(
    [...questionStep.querySelectorAll('input:checked,input[type=range]')].map((input) =>
      input.name.replace('[]', ''),
    ),
  ).size;
  setProgress(52 + (answered / questions.length) * 46);
});
document.getElementById('survey-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  const data = {};
  new FormData(form).forEach((value, key) => {
    const name = key.replace('[]', '');
    if (key.endsWith('[]')) {
      (data[name] = data[name] || []).push(value);
    } else {
      data[name] = value;
    }
  });
  try {
    const res = await fetch('/api/survey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || 'Submission failed');
    questionStep.classList.remove('active');
    document.getElementById('survey-success').hidden = false;
    status.textContent = 'Complete · Thank you';
    setProgress(100);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    status.textContent = `Your answers were not sent. ${err.message}`;
    submitButton.disabled = false;
  }
});
