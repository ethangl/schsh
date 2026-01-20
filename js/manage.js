// Manage page - upload, delete, publish/unpublish

const loginSection = document.getElementById('login-section');
const manageSection = document.getElementById('manage-section');
const deniedSection = document.getElementById('denied-section');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const deniedLogoutBtn = document.getElementById('denied-logout-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const uploadStatus = document.getElementById('upload-status');
const imagesContainer = document.getElementById('images');
const noImages = document.getElementById('no-images');

// Auth state
db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    handleUser(session.user);
  } else {
    showLogin();
  }
});

// Check initial session
db.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) {
    handleUser(session.user);
  } else {
    showLogin();
  }
});

function handleUser(user) {
  if (isAllowedEmail(user.email)) {
    showManage(user);
    loadImages();
  } else {
    showDenied();
  }
}

function showLogin() {
  loginSection.hidden = false;
  manageSection.hidden = true;
  deniedSection.hidden = true;
  logoutBtn.hidden = true;
  userEmail.textContent = '';
}

function showManage(user) {
  loginSection.hidden = true;
  manageSection.hidden = false;
  deniedSection.hidden = true;
  logoutBtn.hidden = false;
  userEmail.textContent = user.email;
}

function showDenied() {
  loginSection.hidden = true;
  manageSection.hidden = true;
  deniedSection.hidden = false;
  logoutBtn.hidden = true;
}

// Login
googleLoginBtn.addEventListener('click', async () => {
  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href
    }
  });
  if (error) console.error('Login error:', error);
});

// Logout
async function logout() {
  await db.auth.signOut();
  showLogin();
}
logoutBtn.addEventListener('click', logout);
deniedLogoutBtn.addEventListener('click', logout);

// Upload
uploadBtn.addEventListener('click', async () => {
  const files = fileInput.files;
  if (!files.length) {
    uploadStatus.textContent = 'Please select files first.';
    return;
  }

  uploadBtn.disabled = true;
  uploadStatus.textContent = `Uploading ${files.length} file(s)...`;

  const { data: { user } } = await db.auth.getUser();
  let uploaded = 0;
  let failed = 0;

  for (const file of files) {
    const ext = file.name.split('.').pop();
    const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await db.storage
      .from('images')
      .upload(storagePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      failed++;
      continue;
    }

    // Insert metadata
    const { error: insertError } = await db
      .from('images')
      .insert({
        user_id: user.id,
        filename: file.name,
        storage_path: storagePath,
        published: false
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      failed++;
    } else {
      uploaded++;
    }
  }

  uploadStatus.textContent = `Done. ${uploaded} uploaded, ${failed} failed.`;
  uploadBtn.disabled = false;
  fileInput.value = '';
  loadImages();
});

// Load images
async function loadImages() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const { data: images, error } = await db
    .from('images')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading images:', error);
    return;
  }

  if (!images || images.length === 0) {
    imagesContainer.innerHTML = '';
    noImages.hidden = false;
    return;
  }

  noImages.hidden = true;
  imagesContainer.innerHTML = images.map(img => {
    const url = db.storage.from('images').getPublicUrl(img.storage_path).data.publicUrl;
    const date = new Date(img.created_at).toLocaleDateString();
    return `
      <div class="image-row" data-id="${img.id}">
        <img src="${url}" alt="${img.filename}">
        <div class="info">
          <div class="filename">${img.filename}</div>
          <div class="date">${date}</div>
        </div>
        <div class="actions">
          <label>
            <input type="checkbox" class="publish-toggle" data-id="${img.id}" ${img.published ? 'checked' : ''}>
            Published
          </label>
          <label>
            <input type="checkbox" class="dark-toggle" data-id="${img.id}" ${img.dark ? 'checked' : ''}>
            Dark
          </label>
          <button class="btn btn-danger delete-btn" data-id="${img.id}" data-path="${img.storage_path}">Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners
  document.querySelectorAll('.publish-toggle').forEach(cb => {
    cb.addEventListener('change', handlePublishToggle);
  });
  document.querySelectorAll('.dark-toggle').forEach(cb => {
    cb.addEventListener('change', handleDarkToggle);
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', handleDelete);
  });
}

// Toggle publish
async function handlePublishToggle(e) {
  const id = e.target.dataset.id;
  const published = e.target.checked;

  const { error } = await db
    .from('images')
    .update({ published })
    .eq('id', id);

  if (error) {
    console.error('Error updating:', error);
    e.target.checked = !published; // revert
  }
}

// Toggle dark
async function handleDarkToggle(e) {
  const id = e.target.dataset.id;
  const dark = e.target.checked;

  const { error } = await db
    .from('images')
    .update({ dark })
    .eq('id', id);

  if (error) {
    console.error('Error updating:', error);
    e.target.checked = !dark; // revert
  }
}

// Delete
async function handleDelete(e) {
  const id = e.target.dataset.id;
  const path = e.target.dataset.path;

  if (!confirm('Delete this image?')) return;

  // Delete from storage
  const { error: storageError } = await db.storage
    .from('images')
    .remove([path]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete from database
  const { error: dbError } = await db
    .from('images')
    .delete()
    .eq('id', id);

  if (dbError) {
    console.error('DB delete error:', dbError);
    return;
  }

  loadImages();
}
