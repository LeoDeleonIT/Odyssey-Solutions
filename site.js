(function(){
  var toggle=document.querySelector('.mobile-toggle');
  var mobile=document.querySelector('.mobile-nav');
  if(toggle&&mobile){toggle.addEventListener('click',function(){var open=mobile.classList.toggle('open');mobile.hidden=!open;toggle.setAttribute('aria-expanded',String(open));});}
  document.querySelectorAll('.nav-menu').forEach(function(menu){var summary=menu.querySelector('summary');menu.addEventListener('toggle',function(){summary.setAttribute('aria-expanded',String(menu.open));});summary.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.open){menu.open=false;summary.focus();}});});
  document.addEventListener('click',function(e){document.querySelectorAll('.nav-menu[open]').forEach(function(menu){if(!menu.contains(e.target))menu.open=false;});});
  var form=document.querySelector('[data-contact-form]');
  if(form){form.addEventListener('submit',async function(e){e.preventDefault();var button=form.querySelector('button[type="submit"]');var status=form.querySelector('[data-form-status]');var original=button.textContent;button.disabled=true;button.textContent='Sending...';status.textContent='';try{var response=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});if(!response.ok)throw new Error('send failed');form.reset();button.textContent='Message sent';status.textContent='Thank you. The Odyssey team will respond within one business day.';}catch(err){button.textContent=original;button.disabled=false;status.textContent='The form could not be sent. Call (832) 805-8467 or email leo@odysseysolutions.co.';}});}
})();
