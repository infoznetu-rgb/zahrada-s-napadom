const workshopForm = document.getElementById('workshop-project');
workshopForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = workshopForm.querySelector('button');
  if (button.disabled) return;
  const data = new FormData(workshopForm);
  const status = workshopForm.querySelector('output');
  button.disabled = true;
  try {
    const photos = [];
    for (const file of data.getAll('photos')) {
      status.textContent = 'Nahrávam fotografiu ' + (photos.length + 1) + '…';
      photos.push(await uploadMedia(file, 'workshop-gallery'));
    }
    const value = {title:data.get('title').trim(), caption:data.get('caption').trim(), group:data.get('group'), photos};
    const {error} = await db.from('zahrada_site_settings').insert({key:'workshop-project-' + Date.now() + '-' + crypto.randomUUID(), value});
    if (error) throw error;
    workshopForm.reset();
    status.textContent = 'Výrobok je zverejnený vo fotogalérii.';
  } catch (error) {
    status.textContent = 'Uloženie sa nepodarilo. ' + error.message;
  } finally { button.disabled = false; }
});