

document.addEventListener('DOMContentLoaded', () => {

  /* ============================
     Storage helpers & utilities
     ============================ */
  const store = {
    get(key, defaultValue = []) {
      try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(key);
    }
  };

  const KEYS = {
    USER: 'vc_user',
    ASSIGNMENTS: 'vc_assignments',
    MATERIALS: 'vc_materials',
    QUIZZES: 'vc_quizzes',
    ANNOUNCEMENTS: 'vc_announcements',
    FORUM: 'vc_forum',
    SUBMISSIONS: 'vc_submissions',
    GRADES: 'vc_grades',
    QUIZ_ATTEMPTS: 'vc_quiz_attempts'
  };

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function fmtDate(msOrIso) {
    if (!msOrIso) return '';
    const d = new Date(msOrIso);
    return d.toLocaleString();
  }

  function escapeHtml(s = '') {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // read file as base64 (so it persists in localStorage)
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ============================
     App state (in-memory)
     ============================ */
  let currentUser = store.get(KEYS.USER, null); // {name, role} or null
  let assignments = store.get(KEYS.ASSIGNMENTS, []);
  let materials = store.get(KEYS.MATERIALS, []);
  let quizzes = store.get(KEYS.QUIZZES, []);
  let announcements = store.get(KEYS.ANNOUNCEMENTS, []);
  let forumPosts = store.get(KEYS.FORUM, []);
  let submissions = store.get(KEYS.SUBMISSIONS, []); // submissions array
  let grades = store.get(KEYS.GRADES, []);
  let quizAttempts = store.get(KEYS.QUIZ_ATTEMPTS, []);

  /* ============================
     DOM references (from your HTML)
     ============================ */
  const splash = document.getElementById('splash');
  const login = document.getElementById('login');
  const teacherApp = document.getElementById('teacherApp');
  const studentApp = document.getElementById('studentApp');
  const topbar = document.getElementById('topbar');
  const userBadge = document.getElementById('userBadge');

  const enterBtn = document.getElementById('enterBtn');
  const backToSplash = document.getElementById('backToSplash');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const nameInput = document.getElementById('name');
  const roleInput = document.getElementById('role');

  // Teacher forms/lists
  const assignmentForm = document.getElementById('assignmentForm');
  const materialForm = document.getElementById('materialForm');
  const quizForm = document.getElementById('quizForm');
  const announcementForm = document.getElementById('announcementForm');
  const forumForm = document.getElementById('forumForm');

  const assignmentList = document.getElementById('assignmentList');
  const materialList = document.getElementById('materialList');
  const quizList = document.getElementById('quizList');
  const announcementList = document.getElementById('announcementList');
  const forumList = document.getElementById('forumList');

  // Student lists/forms
  const studentAssignmentList = document.getElementById('studentAssignmentList');
  const studentMaterialList = document.getElementById('studentMaterialList');
  const studentQuizList = document.getElementById('studentQuizList');
  const studentAnnouncementList = document.getElementById('studentAnnouncementList');
  const studentForumList = document.getElementById('studentForumList');

  const sForumForm = document.getElementById('sForumForm');
  const sForumInput = document.getElementById('sfMsg');

  // Submissions + grades
  const submissionList = document.getElementById('submissionList');
  const gradesList = document.getElementById('gradesList');

  // Top-level nav/buttons inside sidebars (delegation used)
  const tNavBtns = Array.from(document.querySelectorAll('#teacherApp .navbtn'));
  const sNavBtns = Array.from(document.querySelectorAll('#studentApp .navbtn'));

  /* ============================
     UI helpers
     ============================ */
  function showOnly(screenEl) {
    // hide all screens
    [splash, login, teacherApp, studentApp].forEach(el => {
      if (!el) return;
      el.classList.remove('visible', 'active');
    });
    if (!screenEl) return;
    screenEl.classList.add('visible');
    screenEl.classList.add('active');
  }

  function showTopbar() {
    if (topbar) topbar.classList.remove('hidden');
  }
  function hideTopbar() {
    if (topbar) topbar.classList.add('hidden');
  }

  function persistAll() {
    store.set(KEYS.ASSIGNMENTS, assignments);
    store.set(KEYS.MATERIALS, materials);
    store.set(KEYS.QUIZZES, quizzes);
    store.set(KEYS.ANNOUNCEMENTS, announcements);
    store.set(KEYS.FORUM, forumPosts);
    store.set(KEYS.SUBMISSIONS, submissions);
    store.set(KEYS.GRADES, grades);
    store.set(KEYS.QUIZ_ATTEMPTS, quizAttempts);
    store.set(KEYS.USER, currentUser);
  }

  function setUserBadge() {
    if (!userBadge) return;
    userBadge.textContent = currentUser ? `${currentUser.name} • ${currentUser.role}` : '';
    // set "who" spans
    document.querySelectorAll('#teacherApp .who, #studentApp .who').forEach(el => {
      if (currentUser) el.textContent = currentUser.name;
      else el.textContent = '';
    });
  }

  /* ============================
     Renderers
     ============================ */

  function renderAssignments() {
    // Teacher list
    if (assignmentList) {
      assignmentList.innerHTML = '';
      if (!assignments.length) {
        assignmentList.innerHTML = `<div class="empty">No assignments yet.</div>`;
      } else {
        assignments
          .slice() // clone
          .sort((a,b)=> b.createdAt - a.createdAt)
          .forEach((a, idx) => {
            const div = document.createElement('div');
            div.className = 'item';
            const fileBtn = a.fileData ? `<a class="btn small" href="${a.fileData}" download="${escapeHtml(a.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> PDF</a>` : '';
            div.innerHTML = `
              <div class="title">${escapeHtml(a.title)}</div>
              <div class="meta">${escapeHtml(a.createdBy || '')} • ${fmtDate(a.createdAt)}</div>
              <div class="muted">${escapeHtml(a.desc || '')}</div>
              <div class="actions">
                ${fileBtn}
                <button class="btn small" data-idx="${idx}" data-action="delete-assignment"><i class="fa-solid fa-trash"></i> Delete</button>
              </div>
            `;
            assignmentList.appendChild(div);
          });
      }
    }

    // Student list
    if (studentAssignmentList) {
      studentAssignmentList.innerHTML = '';
      if (!assignments.length) {
        studentAssignmentList.innerHTML = `<div class="empty">No assignments published.</div>`;
      } else {
        assignments.slice().sort((a,b)=> new Date(a.due||0) - new Date(b.due||0)).forEach(a => {
          // check if this student submitted
          const me = currentUser?.name || '';
          const mySubmission = submissions.find(s => s.type === 'assignment' && s.targetId === a.id && s.studentName === me);
          const left = a.due ? (() => { const end = new Date(a.due).setHours(23,59,59,999); return Math.floor((end - Date.now())/86400000); })() : null;
          const tag = left === null ? '' : (left >= 0 ? `<span class="badge deadline">${left} day(s) left</span>` : `<span class="badge late">Past due</span>`);
          const div = document.createElement('div');
          div.className = 'item';
          div.innerHTML = `
            <div class="title">${escapeHtml(a.title)}</div>
            <div class="meta">Due: ${escapeHtml(a.due || '—')} ${tag}</div>
            <div class="muted">${escapeHtml(a.desc || '')}</div>
            <div>
              ${a.fileData ? `<a class="btn small" href="${a.fileData}" download="${escapeHtml(a.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> PDF</a>` : ''}
            </div>
            <form class="row submit-assignment" data-target="${a.id}">
              <input type="file" accept="application/pdf" required />
              <div class="actions">
                <button class="btn small primary" type="submit"><i class="fa-solid fa-upload"></i> Submit</button>
                ${ mySubmission ? `<a class="btn small" href="${mySubmission.fileData}" download="${escapeHtml(mySubmission.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> My file</a>
                                   <button class="btn small" type="button" data-target="${a.id}" data-action="delete-my-submission"><i class="fa-solid fa-trash"></i> Delete</button>` : ''}
              </div>
            </form>
          `;
          studentAssignmentList.appendChild(div);
        });
      }
    }
  }

  function renderMaterials() {
    if (materialList) {
      materialList.innerHTML = '';
      if (!materials.length) materialList.innerHTML = `<div class="empty">No materials yet.</div>`;
      else {
        materials.slice().forEach((m, idx) => {
          const div = document.createElement('div'); div.className = 'item';
          div.innerHTML = `
            <div class="title">${escapeHtml(m.title)}</div>
            <div class="meta">By ${escapeHtml(m.createdBy || '')} • ${fmtDate(m.createdAt)}</div>
            <div class="actions">
              ${m.fileData ? `<a class="btn small" href="${m.fileData}" download="${escapeHtml(m.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> Download</a>` : ''}
              <button class="btn small" data-idx="${idx}" data-action="delete-material"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
          `;
          materialList.appendChild(div);
        });
      }
    }

    if (studentMaterialList) {
      studentMaterialList.innerHTML = '';
      if (!materials.length) studentMaterialList.innerHTML = `<div class="empty">No materials yet.</div>`;
      else {
        materials.slice().forEach(m => {
          const div = document.createElement('div'); div.className = 'item';
          div.innerHTML = `
            <div class="title">${escapeHtml(m.title)}</div>
            <div class="meta">By ${escapeHtml(m.createdBy || '')}</div>
            <div class="actions">${m.fileData ? `<a class="btn small" href="${m.fileData}" download="${escapeHtml(m.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> Download</a>` : ''}</div>
          `;
          studentMaterialList.appendChild(div);
        });
      }
    }
  }

  function renderQuizzes() {
    if (quizList) {
      quizList.innerHTML = '';
      if (!quizzes.length) quizList.innerHTML = `<div class="empty">No quizzes yet.</div>`;
      else quizzes.slice().forEach((q, idx) => {
        const div = document.createElement('div'); div.className = 'item';
        div.innerHTML = `
          <div class="title">${escapeHtml(q.question)}</div>
          <div class="muted">Options: ${q.options.map(o=>escapeHtml(o)).join(' • ')}</div>
          <div class="actions">
            <button class="btn small" data-idx="${idx}" data-action="delete-quiz"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        `;
        quizList.appendChild(div);
      });
    }

    if (studentQuizList) {
      studentQuizList.innerHTML = '';
      if (!quizzes.length) studentQuizList.innerHTML = `<div class="empty">No quizzes yet.</div>`;
      else quizzes.slice().forEach(q => {
        const div = document.createElement('div'); div.className = 'item';
        div.innerHTML = `
          <div class="title">${escapeHtml(q.question)}</div>
          <div class="muted">Answer (type exactly one option):</div>
          <form class="row submit-quiz" data-target="${q.id}">
            <input type="text" required placeholder="Your answer" />
            <div class="actions">
              <button class="btn small primary" type="submit"><i class="fa-solid fa-paper-plane"></i> Submit</button>
            </div>
          </form>
        `;
        studentQuizList.appendChild(div);
      });
    }
  }

  function renderAnnouncements() {
    if (announcementList) {
      announcementList.innerHTML = '';
      if (!announcements.length) announcementList.innerHTML = `<div class="empty">No announcements yet.</div>`;
      else announcements.slice().forEach((a, idx) => {
        const div = document.createElement('div'); div.className = 'item';
        div.innerHTML = `
          <div class="title">${escapeHtml(a.title)}</div>
          <div class="meta">By ${escapeHtml(a.createdBy || '')} • ${fmtDate(a.createdAt)}</div>
          <div class="muted">${escapeHtml(a.text)}</div>
          <div class="actions">
            ${ currentUser && currentUser.role === 'teacher' ? `<button class="btn small" data-idx="${idx}" data-action="delete-announcement"><i class="fa-solid fa-trash"></i> Delete</button>` : '' }
          </div>
        `;
        announcementList.appendChild(div);
      });
    }

    if (studentAnnouncementList) {
      studentAnnouncementList.innerHTML = '';
      if (!announcements.length) studentAnnouncementList.innerHTML = `<div class="empty">No announcements yet.</div>`;
      else announcements.slice().forEach(a => {
        const div = document.createElement('div'); div.className='item';
        div.innerHTML = `
          <div class="title">${escapeHtml(a.title)}</div>
          <div class="meta">By ${escapeHtml(a.createdBy || '')} • ${fmtDate(a.createdAt)}</div>
          <div class="muted">${escapeHtml(a.text)}</div>
        `;
        studentAnnouncementList.appendChild(div);
      });
    }
  }

  function renderForum() {
    if (forumList) {
      forumList.innerHTML = '';
      if (!forumPosts.length) forumList.innerHTML = `<div class="empty">No posts yet</div>`;
      else forumPosts.slice().forEach((p, idx) => {
        const div = document.createElement('div'); div.className = 'item';
        const canDelete = currentUser && (currentUser.role === 'teacher' || p.user === currentUser.name);
        div.innerHTML = `
          <div class="title">${escapeHtml(p.user)}</div>
          <div class="meta">${fmtDate(p.createdAt)}</div>
          <div class="muted">${escapeHtml(p.msg)}</div>
          <div class="actions">${ canDelete ? `<button class="btn small" data-idx="${idx}" data-action="delete-forum"><i class="fa-solid fa-trash"></i> Delete</button>` : '' }</div>
        `;
        forumList.appendChild(div);
      });
    }

    if (studentForumList) {
      studentForumList.innerHTML = '';
      if (!forumPosts.length) studentForumList.innerHTML = `<div class="empty">No posts yet</div>`;
      else forumPosts.slice().forEach(p => {
        const div = document.createElement('div'); div.className='item';
        div.innerHTML = `<div class="title">${escapeHtml(p.user)}</div><div class="meta">${fmtDate(p.createdAt)}</div><div class="muted">${escapeHtml(p.msg)}</div>`;
        studentForumList.appendChild(div);
      });
    }
  }

  function renderSubmissionsAndGrades() {
    if (submissionList) {
      submissionList.innerHTML = '';
      if (!submissions.length) submissionList.innerHTML = `<div class="empty">No submissions yet</div>`;
      else submissions.slice().forEach((s, idx) => {
        const div = document.createElement('div'); div.className='item';
        const fileLink = s.fileData ? `<a class="btn small" href="${s.fileData}" download="${escapeHtml(s.fileName)}"><i class="fa-solid fa-file-arrow-down"></i> Download</a>` : '';
        const answerHtml = s.answer ? `<div class="muted">Answer: ${escapeHtml(s.answer)}</div>` : '';
        div.innerHTML = `
          <div class="title">${s.type === 'assignment' ? `Assignment: ${escapeHtml(s.targetTitle)}` : `Quiz: ${escapeHtml(s.targetTitle)}`}</div>
          <div class="meta">By ${escapeHtml(s.studentName)} • ${fmtDate(s.submittedAt)}</div>
          ${answerHtml}
          <div class="actions">
            ${fileLink}
            <input type="text" class="grade-input" placeholder="Grade (e.g. A or 8/10)" value="${escapeHtml(s.grade || '')}" data-idx="${idx}" />
            <button class="btn small" data-idx="${idx}" data-action="assign-grade"><i class="fa-solid fa-pen-to-square"></i> Save Grade</button>
          </div>
        `;
        submissionList.appendChild(div);
      });
    }

    if (gradesList) {
      gradesList.innerHTML = '';
      if (!submissions.length) gradesList.innerHTML = `<div class="empty">No grades yet</div>`;
      else {
        submissions.slice().forEach(s => {
          const div = document.createElement('div'); div.className='item';
          div.innerHTML = `
            <div class="title">${s.type === 'assignment' ? escapeHtml(s.targetTitle) : escapeHtml(s.targetTitle)}</div>
            <div class="meta">${escapeHtml(s.studentName)}</div>
            <div class="muted">Grade: ${escapeHtml(s.grade || 'Not graded')}</div>
          `;
          gradesList.appendChild(div);
        });
      }
    }
  }

  function renderAll() {
    renderAssignments();
    renderMaterials();
    renderQuizzes();
    renderAnnouncements();
    renderForum();
    renderSubmissionsAndGrades();
    setUserBadge();
  }

  /* ============================
     Initial screen and topbar
     ============================ */
  showOnly(splash);
  hideTopbar();
  setUserBadge();

  /* ============================
     Navigation handlers
     ============================ */
  // Enter button -> login screen
  if (enterBtn) enterBtn.addEventListener('click', () => showOnly(login));
  if (backToSplash) backToSplash.addEventListener('click', () => showOnly(splash));

  // login
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = (nameInput?.value || '').trim();
      const role = (roleInput?.value || 'student').trim();
      if (!name) return alert('Please enter a name');
      currentUser = { name, role };
      store.set(KEYS.USER, currentUser);
      setUserBadge();
      showTopbar();
      if (role === 'teacher') {
        showOnly(teacherApp);
      } else {
        showOnly(studentApp);
      }
      // render lists for current user
      renderAll();
    });
  }

  // logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (!confirm('Logout?')) return;
      currentUser = null;
      store.remove(KEYS.USER);
      setUserBadge();
      hideTopbar();
      // hide both dashboards and show login
      [teacherApp, studentApp].forEach(x => { if (x) x.classList.remove('visible','active'); });
      showOnly(login);
      // leave data in storage (teacher's uploads remain)
      // clear name field to avoid persisting input value on next login
      if (nameInput) nameInput.value = '';
    });
  }

  // sidebar nav buttons within teacher/student dashboards
  function initNavBtns() {
    const navBtns = document.querySelectorAll('.navbtn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;
        if (view === 'back') { // go back to login
          showOnly(login);
          return;
        }
        // hide all views under both .workspace sections
        document.querySelectorAll('.workspace .view').forEach(v => v.classList.remove('visible'));
        const target = document.getElementById(view);
        if (target) target.classList.add('visible');
      });
    });
  }
  initNavBtns();

  /* ============================
     Teacher form handlers (create items)
     ============================ */

  // Assignment creation (teacher)
  if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (document.getElementById('aTitle')?.value || '').trim();
      const desc = (document.getElementById('aDesc')?.value || '').trim();
      const due = (document.getElementById('aDue')?.value || '').trim();
      const fileInput = document.getElementById('aFile');
      if (!title || !desc || !due) return alert('Fill all fields');
      let fileData = null, fileName = null;
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const f = fileInput.files[0];
        fileName = f.name;
        fileData = await readFileAsBase64(f);
      }
      const a = { id: uid(), title, desc, due, fileData, fileName, createdBy: currentUser?.name, createdAt: Date.now() };
      assignments.unshift(a);
      persistAll();
      assignmentForm.reset();
      renderAll();
      alert('Assignment created');
    });
  }

  // Material creation (teacher)
  if (materialForm) {
    materialForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = (document.getElementById('mTitle')?.value || '').trim();
      const fileInput = document.getElementById('mFile');
      if (!title) return alert('Enter a title');
      if (!fileInput || !fileInput.files || !fileInput.files[0]) return alert('Select a file');
      const f = fileInput.files[0];
      const fileData = await readFileAsBase64(f);
      const fileName = f.name;
      const m = { id: uid(), title, fileData, fileName, createdBy: currentUser?.name, createdAt: Date.now() };
      materials.unshift(m);
      persistAll();
      materialForm.reset();
      renderAll();
      alert('Material uploaded');
    });
  }

  // Quiz creation (teacher) - single question with options
  if (quizForm) {
    quizForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const question = (document.getElementById('qQuestion')?.value || '').trim();
      const optionsRaw = (document.getElementById('qOptions')?.value || '').trim();
      const answerText = (document.getElementById('qAnswer')?.value || '').trim();
      if (!question || !optionsRaw || !answerText) return alert('Fill all fields');
      const options = optionsRaw.split(',').map(x => x.trim()).filter(Boolean);
      const q = { id: uid(), question, options, answerText, createdBy: currentUser?.name, createdAt: Date.now() };
      quizzes.unshift(q);
      persistAll();
      quizForm.reset();
      renderAll();
      alert('Quiz question added');
    });
  }

  // Announcement creation (teacher)
  if (announcementForm) {
    announcementForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = (document.getElementById('annTitle')?.value || '').trim();
      const text = (document.getElementById('annText')?.value || '').trim();
      if (!title || !text) return alert('Fill all fields');
      const a = { id: uid(), title, text, createdBy: currentUser?.name, createdAt: Date.now() };
      announcements.unshift(a);
      persistAll();
      announcementForm.reset();
      renderAll();
      alert('Announcement posted');
    });
  }

  // Teacher forum post
  if (forumForm) {
    forumForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = (document.getElementById('fMsg')?.value || '').trim();
      if (!msg) return alert('Enter a message');
      forumPosts.unshift({ id: uid(), msg, user: currentUser?.name, createdAt: Date.now() });
      persistAll();
      forumForm.reset();
      renderAll();
      alert('Posted to forum');
    });
  }

  // Student forum post
  if (sForumForm) {
    sForumForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = (sForumInput?.value || '').trim();
      if (!msg) return alert('Enter a message');
      forumPosts.unshift({ id: uid(), msg, user: currentUser?.name, createdAt: Date.now() });
      persistAll();
      sForumForm.reset();
      renderAll();
      alert('Posted to forum');
    });
  }

  /* ============================
     Student submissions (delegated)
     ============================ */
  // handle submit-assignment form and submit-quiz forms via event delegation
  document.body.addEventListener('submit', async (e) => {
    // student assignment submission
    if (e.target && e.target.matches && e.target.matches('.submit-assignment')) {
      e.preventDefault();
      // require logged in student
      if (!currentUser || currentUser.role !== 'student') return alert('Please login as a student to submit');
      const targetId = e.target.dataset.target;
      const input = e.target.querySelector('input[type="file"]');
      if (!input || !input.files || !input.files[0]) return alert('Choose a PDF file first.');
      const file = input.files[0];
      if (file.type !== 'application/pdf') return alert('Only PDF allowed.');
      const fileData = await readFileAsBase64(file);
      const sub = {
        id: uid(),
        type: 'assignment',
        targetId,
        targetTitle: (assignments.find(a=>a.id===targetId) || {}).title || '',
        studentName: currentUser.name,
        fileData,
        fileName: file.name,
        answer: null,
        grade: null,
        submittedAt: Date.now()
      };
      submissions.unshift(sub);
      persistAll();
      renderAll();
      e.target.reset();
      alert('Submitted!');
      return;
    }

    // student quiz submission (text answer)
    if (e.target && e.target.matches && e.target.matches('.submit-quiz')) {
      e.preventDefault();
      if (!currentUser || currentUser.role !== 'student') return alert('Please login as a student to submit quiz answers');
      const targetId = e.target.dataset.target;
      const input = e.target.querySelector('input[type="text"]');
      const ans = input?.value?.trim();
      if (!ans) return alert('Enter an answer');
      const q = quizzes.find(q=>q.id===targetId);
      const sub = {
        id: uid(),
        type: 'quiz',
        targetId,
        targetTitle: q ? q.question : '',
        studentName: currentUser.name,
        fileData: null,
        fileName: null,
        answer: ans,
        grade: null,
        submittedAt: Date.now()
      };
      submissions.unshift(sub);
      // record attempt optionally
      quizAttempts.unshift({ id: uid(), quizId: targetId, studentName: currentUser.name, selected: ans, correct: (q && q.answerText === ans), at: Date.now() });
      persistAll();
      renderAll();
      e.target.reset();
      alert('Quiz answer submitted');
      return;
    }
  });

  /* ============================
     Click delegation (delete, grade, other actions)
     ============================ */
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    const idxData = btn.dataset.idx;
    const target = btn.dataset.target; // used for delete-my-submission

    // Delete assignment (teacher)
    if (action === 'delete-assignment' && typeof idxData !== 'undefined') {
      if (!confirm('Delete this assignment?')) return;
      const idx = Number(idxData);
      const removed = assignments.splice(idx, 1);
      // remove related submissions
      if (removed && removed[0] && removed[0].id) {
        submissions = submissions.filter(s => !(s.type==='assignment' && s.targetId === removed[0].id));
      }
      persistAll();
      renderAll();
      return;
    }

    // Delete material (teacher)
    if (action === 'delete-material' && typeof idxData !== 'undefined') {
      if (!confirm('Delete this material?')) return;
      materials.splice(Number(idxData), 1);
      persistAll();
      renderAll();
      return;
    }

    // Delete quiz (teacher)
    if (action === 'delete-quiz' && typeof idxData !== 'undefined') {
      if (!confirm('Delete this quiz?')) return;
      const idx = Number(idxData);
      const removed = quizzes.splice(idx,1);
      // remove quiz submissions
      if (removed && removed[0] && removed[0].id) {
        submissions = submissions.filter(s => !(s.type==='quiz' && s.targetId === removed[0].id));
      }
      persistAll();
      renderAll();
      return;
    }

    // Delete announcement (teacher)
    if (action === 'delete-announcement' && typeof idxData !== 'undefined') {
      if (!confirm('Delete this announcement?')) return;
      announcements.splice(Number(idxData),1);
      persistAll();
      renderAll();
      return;
    }

    // Delete forum post (teacher any post, student own post only)
    if (action === 'delete-forum' && typeof idxData !== 'undefined') {
      const idx = Number(idxData);
      const post = forumPosts[idx];
      if (!post) return;
      // allow if teacher or owner
      if (!currentUser) return alert('Not logged in');
      if (currentUser.role !== 'teacher' && post.user !== currentUser.name) return alert('You can only delete your own forum posts');
      if (!confirm('Delete this forum post?')) return;
      forumPosts.splice(idx,1);
      persistAll();
      renderAll();
      return;
    }

    // Delete my submission (student) for an assignment
    if (action === 'delete-my-submission' && typeof target !== 'undefined') {
      if (!currentUser || currentUser.role !== 'student') return;
      const tid = target;
      submissions = submissions.filter(s => !(s.type==='assignment' && s.targetId===tid && s.studentName === currentUser.name));
      persistAll();
      renderAll();
      return;
    }

    // Assign grade (teacher saves grade for a submission)
    if (action === 'assign-grade' && typeof btn.dataset.idx !== 'undefined') {
      if (!currentUser || currentUser.role !== 'teacher') return alert('Only teachers can assign grades');
      const sIndex = Number(btn.dataset.idx);
      const parent = btn.closest('.item');
      const input = parent && parent.querySelector('.grade-input');
      const val = input && input.value && input.value.trim();
      if (!val) return alert('Enter grade');
      if (!submissions[sIndex]) return alert('Submission not found');
      submissions[sIndex].grade = val;
      persistAll();
      renderAll();
      alert('Grade saved');
      return;
    }
  });

  /* ============================
     Final initialization
     ============================ */
  // ensure arrays are defined (in case localStorage returned null)
  assignments = assignments || [];
  materials = materials || [];
  quizzes = quizzes || [];
  announcements = announcements || [];
  forumPosts = forumPosts || [];
  submissions = submissions || [];
  grades = grades || [];
  quizAttempts = quizAttempts || [];

  // persist initial state to ensure keys exist
  persistAll();

  // If a user was previously saved in storage, we can prefill name input but DO NOT auto-login silently.
  const savedUser = store.get(KEYS.USER, null);
  if (savedUser && nameInput) {
    nameInput.value = savedUser.name || '';
    // Do not auto-show dashboard; user must press login (this matches your prior behaviour)
  }

  // Render lists so when user logs in they see current data.
  renderAll();

}); // DOMContentLoaded end
