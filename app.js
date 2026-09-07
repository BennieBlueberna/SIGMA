/* ==========================================================================
   SIGMA — app.js
   Toda la interactividad del prototipo visual. Los datos vienen de data.json
   ========================================================================== */

(function () {
  "use strict";

  let DATA = null;
  let selectedBioStudent = null;
  let bioStep = 1;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ------------------------------------------------------------------ */
  /* Carga de datos                                                      */
  /* ------------------------------------------------------------------ */
  async function loadData() {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("No se pudo cargar data.json");
    return res.json();
  }

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function initials(name) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function statusBadge(estado) {
    const map = {
      permitido: { cls: "badge-ok", label: "Permitido" },
      denegado: { cls: "badge-deny", label: "Denegado" },
      activo: { cls: "badge-ok", label: "Activo" },
      inactivo: { cls: "badge-offline", label: "Inactivo" },
      pendiente: { cls: "badge-warn", label: "Pendiente" },
      conectado: { cls: "badge-ok", label: "Conectado" },
      desconectado: { cls: "badge-offline", label: "Sin conexión" },
    };
    const m = map[estado] || { cls: "badge-info", label: estado };
    return `<span class="badge ${m.cls}"><span class="dot"></span>${m.label}</span>`;
  }

  function toast(message, type) {
    const region = $("#toast-region");
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.setAttribute("role", "status");
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 200ms";
      setTimeout(() => el.remove(), 220);
    }, 3200);
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 1 — Login                                                    */
  /* ------------------------------------------------------------------ */
  function initLogin() {
    const form = $("#login-form");
    const userInput = $("#login-user");
    const passInput = $("#login-pass");
    const toggleBtn = $("#toggle-pass");
    const submitBtn = $("#login-submit");
    const submitLabel = $("#login-submit-label");
    const errorBanner = $("#login-error-banner");
    const errorUser = $("#error-user");
    const errorPass = $("#error-pass");

    toggleBtn.addEventListener("click", () => {
      const isPassword = passInput.type === "password";
      passInput.type = isPassword ? "text" : "password";
      toggleBtn.setAttribute("aria-pressed", String(isPassword));
      toggleBtn.setAttribute("aria-label", isPassword ? "Ocultar contraseña" : "Mostrar contraseña");
    });

    $("#forgot-pass-btn").addEventListener("click", () => {
      toast("Se envió un enlace de recuperación a tu correo institucional.", "ok");
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      errorBanner.classList.remove("is-visible");
      let valid = true;

      const emailLike = /\S+@\S+\.\S+/.test(userInput.value.trim());
      if (!emailLike) {
        userInput.setAttribute("aria-invalid", "true");
        errorUser.classList.add("is-visible");
        valid = false;
      } else {
        userInput.removeAttribute("aria-invalid");
        errorUser.classList.remove("is-visible");
      }

      if (passInput.value.trim().length < 4) {
        passInput.setAttribute("aria-invalid", "true");
        errorPass.classList.add("is-visible");
        valid = false;
      } else {
        passInput.removeAttribute("aria-invalid");
        errorPass.classList.remove("is-visible");
      }

      if (!valid) return;

      submitBtn.disabled = true;
      submitLabel.innerHTML = '<span class="spinner" aria-hidden="true"></span> Verificando...';

      setTimeout(() => {
        submitBtn.disabled = false;
        submitLabel.textContent = "Iniciar sesión";
        enterApp(userInput.value.trim());
      }, 850);
    });
  }

  function enterApp(email) {
    $("#login-screen").style.display = "none";
    $("#app-shell").classList.add("is-active");
    $("#user-email").textContent = email;
    $("#settings-email").textContent = email;
    $("#user-avatar").textContent = initials(email.split("@")[0].replace(/[._]/g, " ")) || "AD";
    toast("Sesión iniciada correctamente.", "ok");
  }

  $("#logout-btn") && $("#logout-btn").addEventListener("click", () => {
    $("#app-shell").classList.remove("is-active");
    $("#login-screen").style.display = "";
    $("#login-form").reset();
  });

  /* ------------------------------------------------------------------ */
  /* Navegación entre vistas                                             */
  /* ------------------------------------------------------------------ */
  const viewTitles = {
    dashboard: ["Dashboard", "Vista general del sistema"],
    "registro-accesos": ["Registro de accesos", "Eventos en tiempo real"],
    estudiantes: ["Estudiantes", "Perfiles registrados"],
    biometrico: ["Registro biométrico", "Vincular rostro a un perfil"],
    historial: ["Historial", "Consulta de registros anteriores"],
    reportes: ["Reportes", "Estadísticas del sistema"],
    alertas: ["Alertas", "Situaciones que requieren atención"],
    configuracion: ["Configuración", "Preferencias de cuenta y sistema"],
  };

  function goToView(view) {
    $$(".nav-item[data-view]").forEach((btn) => {
      const isMatch = btn.dataset.view === view;
      btn.toggleAttribute("aria-current", isMatch);
      if (isMatch) btn.setAttribute("aria-current", "page");
    });
    $$(".view").forEach((v) => v.classList.remove("is-active"));
    const target = $(`.view[data-view-panel="${view}"]`);
    if (target) target.classList.add("is-active");

    const [title, sub] = viewTitles[view] || ["SIGMA", ""];
    $("#topbar-title").textContent = title;
    $("#topbar-subtitle").textContent = sub;

    closeSidebarMobile();
    target && target.scrollTo && window.scrollTo({ top: 0 });
  }

  function initNav() {
    $$(".nav-item[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => goToView(btn.dataset.view));
    });
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => goToView(btn.dataset.goto));
    });
  }

  function closeSidebarMobile() {
    $("#sidebar").classList.remove("is-open");
    $("#sidebar-scrim").classList.remove("is-active");
    $("#menu-btn").setAttribute("aria-expanded", "false");
  }

  function initMobileNav() {
    const menuBtn = $("#menu-btn");
    const sidebar = $("#sidebar");
    const scrim = $("#sidebar-scrim");
    menuBtn.addEventListener("click", () => {
      const isOpen = sidebar.classList.toggle("is-open");
      scrim.classList.toggle("is-active", isOpen);
      menuBtn.setAttribute("aria-expanded", String(isOpen));
    });
    scrim.addEventListener("click", closeSidebarMobile);
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 2 — Dashboard principal                                      */
  /* ------------------------------------------------------------------ */
  function renderDashboard() {
    const s = DATA.estadisticas;
    $("#metric-students").textContent = s.estudiantesRegistrados.toLocaleString("es-CO");
    $("#metric-students-sub").textContent = `${s.estudiantesActivosHoy} estudiantes activos`;
    $("#metric-attendance").textContent = s.asistenciasHoy;
    $("#metric-attendance-delta").textContent = `+${s.cambioAsistenciaAyer}% respecto ayer`;
    $("#metric-access").textContent = s.accesosHoy;
    $("#metric-failed").textContent = String(s.intentosFallidos).padStart(2, "0");

    const recent = DATA.accesos.slice(0, 5);
    $("#dashboard-recent-list").innerHTML = recent.map(recordRowHTML).join("");
    attachRecordRowEvents($("#dashboard-recent-list"));

    const alerts = DATA.alertas.slice(0, 3);
    $("#dashboard-alerts-list").innerHTML = alerts.map(alertItemHTML).join("");
  }

  /* ------------------------------------------------------------------ */
  /* Registro de accesos (filas reutilizables) + detalle                 */
  /* ------------------------------------------------------------------ */
  function recordRowHTML(a) {
    return `
      <div class="record-row" data-record-id="${a.id}" tabindex="0" role="button" aria-label="Ver detalle de acceso de ${a.estudiante}">
        <span class="avatar sm">${a.iniciales}</span>
        <span class="record-row__name">${a.estudiante}</span>
        <span class="mono record-row__meta record-row__col-id">${a.estudianteId}</span>
        <span class="record-row__meta">${a.fecha} · ${a.hora}</span>
        <span class="record-row__meta record-row__col-device">${a.dispositivo}</span>
        <span>${statusBadge(a.estado)}</span>
        <button class="btn-ghost btn-sm" type="button">Ver</button>
      </div>`;
  }

  function attachRecordRowEvents(container) {
    $$(".record-row", container).forEach((row) => {
      const open = () => openAccessDetail(row.dataset.recordId);
      row.addEventListener("click", open);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
      });
    });
  }

  function openAccessDetail(id) {
    const record = DATA.accesos.find((a) => a.id === id) || DATA._extra?.find((a) => a.id === id);
    if (!record) return;
    const student = DATA.estudiantes.find((s) => s.id === record.estudianteId);
    showModal(`
      <div class="modal__head">
        <h3 id="modal-title">Detalle del acceso</h3>
        <button class="modal__close" id="modal-close-btn" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="profile-head">
        <span class="avatar lg">${record.iniciales}</span>
        <div>
          <div class="profile-head__name">${record.estudiante}</div>
          <div class="profile-head__meta">ID ${record.estudianteId}${student ? " · " + student.grado : ""}</div>
        </div>
      </div>
      <div class="detail-list">
        <div class="detail-list__row"><span class="detail-list__label">Fecha</span><span>${record.fecha}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Hora</span><span class="mono">${record.hora}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Tipo de registro</span><span>${record.tipo}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Dispositivo</span><span>${record.dispositivo}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Estado</span><span>${statusBadge(record.estado)}</span></div>
      </div>
      ${student ? `<button class="btn btn-secondary" style="width:100%" data-open-profile="${student.id}">Ver perfil completo</button>` : ""}
    `);
  }

  function renderAccessList(filterText, filterStatus, filterDevice) {
    const all = [...(DATA._extra || []), ...DATA.accesos];
    const filtered = all.filter((a) => {
      const matchesText = !filterText || (a.estudiante.toLowerCase().includes(filterText) || a.estudianteId.includes(filterText));
      const matchesStatus = !filterStatus || a.estado === filterStatus;
      const matchesDevice = !filterDevice || a.dispositivo === filterDevice;
      return matchesText && matchesStatus && matchesDevice;
    });
    const list = $("#access-list");
    list.innerHTML = filtered.map(recordRowHTML).join("");
    attachRecordRowEvents(list);
    $("#access-empty").style.display = filtered.length ? "none" : "block";
  }

  function initAccessView() {
    const deviceSelect = $("#access-filter-device");
    DATA.dispositivos.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.nombre.replace("-CAM", "");
      opt.textContent = d.nombre;
      deviceSelect.appendChild(opt);
    });

    const update = () => {
      renderAccessList(
        $("#access-search").value.trim().toLowerCase(),
        $("#access-filter-status").value,
        $("#access-filter-device").value
      );
    };
    $("#access-search").addEventListener("input", update);
    $("#access-filter-status").addEventListener("change", update);
    $("#access-filter-device").addEventListener("change", update);
    update();
  }

  /* Simulación de "tiempo real": agrega un registro nuevo cada cierto tiempo */
  function simulateLiveAccess() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = prefersReduced ? 0 : 9000;
    if (!interval) return;

    DATA._extra = DATA._extra || [];
    let counter = 1;

    setInterval(() => {
      const activeView = $(".view.is-active");
      if (!activeView || activeView.dataset.viewPanel !== "registro-accesos") return;

      const student = DATA.estudiantes[Math.floor(Math.random() * DATA.estudiantes.length)];
      const device = DATA.dispositivos[Math.floor(Math.random() * DATA.dispositivos.length)];
      const denied = Math.random() < 0.15;
      const now = new Date();
      const record = {
        id: "live-" + Date.now() + "-" + counter++,
        estudianteId: student.id,
        estudiante: student.nombre,
        iniciales: student.iniciales,
        fecha: "Hoy",
        hora: now.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        tipo: "Entrada",
        dispositivo: device.nombre.replace("ESP32-CAM", "ESP32"),
        estado: denied ? "denegado" : "permitido",
      };
      DATA._extra.unshift(record);

      const list = $("#access-list");
      if (!list) return;
      const noFiltersApplied = !$("#access-search").value && !$("#access-filter-status").value && !$("#access-filter-device").value;
      if (noFiltersApplied) {
        const row = document.createElement("div");
        row.innerHTML = recordRowHTML(record);
        const el = row.firstElementChild;
        el.classList.add("is-new");
        list.prepend(el);
        attachRecordRowEvents(list);
        toast(`${denied ? "Acceso denegado" : "Nuevo acceso"}: ${student.nombre}`, denied ? "warn" : "ok");
      }
    }, interval);
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 7 y 8 — Estudiantes + perfil                                 */
  /* ------------------------------------------------------------------ */
  function studentCardHTML(s) {
    return `
      <div class="card student-card">
        <div class="student-card__top">
          <span class="avatar">${s.iniciales}</span>
          <div>
            <div class="student-card__name">${s.nombre}</div>
            <div class="student-card__meta">ID ${s.id} · Grado ${s.grado}</div>
          </div>
        </div>
        <div class="student-card__row"><span>Estado</span>${statusBadge(s.estado)}</div>
        <div class="student-card__row"><span>Asistencias</span><span class="mono">${s.asistencias}%</span></div>
        <div class="student-card__foot">
          <span class="student-card__meta">${s.biometriaRegistrada ? "Biometría activa" : "Sin biometría"}</span>
          <button class="btn btn-secondary btn-sm" data-open-profile="${s.id}">Ver perfil</button>
        </div>
      </div>`;
  }

  function openStudentProfile(id) {
    const s = DATA.estudiantes.find((x) => x.id === id);
    if (!s) return;
    showModal(`
      <div class="modal__head">
        <h3 id="modal-title">Perfil del estudiante</h3>
        <button class="modal__close" id="modal-close-btn" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="profile-head">
        <span class="avatar lg">${s.iniciales}</span>
        <div>
          <div class="profile-head__name">${s.nombre}</div>
          <div class="profile-head__meta">ID ${s.id} · Grado ${s.grado}</div>
        </div>
      </div>
      <div class="detail-list">
        <div class="detail-list__row"><span class="detail-list__label">Estado</span><span>${statusBadge(s.estado)}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Registrado desde</span><span>${s.fechaRegistro}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Último acceso</span><span>${s.ultimoAcceso}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Hora de entrada</span><span class="mono">${s.horaEntrada}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Hora de salida</span><span class="mono">${s.horaSalida}</span></div>
        <div class="detail-list__row"><span class="detail-list__label">Asistencias</span><span class="mono">${s.asistencias}%</span></div>
      </div>
      <h4 style="font-size:0.86rem; margin-bottom:8px;">Historial reciente</h4>
      <div class="mini-history">
        ${s.historialReciente.length
          ? s.historialReciente.map((h) => `
            <div class="mini-history__row">
              <span>${h.fecha} · ${h.tipo}</span>
              <span class="mono">${h.hora}</span>
              ${statusBadge(h.estado)}
            </div>`).join("")
          : `<p style="font-size:0.84rem; color:var(--color-muted);">Sin registros recientes.</p>`}
      </div>
    `);
  }

  function renderStudents(filterText, filterGrade, filterStatus) {
    const filtered = DATA.estudiantes.filter((s) => {
      const matchesText = !filterText || s.nombre.toLowerCase().includes(filterText) || s.id.includes(filterText);
      const matchesGrade = !filterGrade || s.grado === filterGrade;
      const matchesStatus = !filterStatus || s.estado === filterStatus;
      return matchesText && matchesGrade && matchesStatus;
    });
    const grid = $("#student-grid");
    grid.innerHTML = filtered.length
      ? filtered.map(studentCardHTML).join("")
      : `<div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state__icon"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
          <h4>Sin resultados</h4><p>No hay estudiantes que coincidan con la búsqueda.</p>
        </div>`;
  }

  function initStudentsView() {
    const gradeSelect = $("#student-filter-grade");
    const grades = [...new Set(DATA.estudiantes.map((s) => s.grado))].sort();
    grades.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g; opt.textContent = `Grado ${g}`;
      gradeSelect.appendChild(opt);
    });

    const update = () => renderStudents(
      $("#student-search").value.trim().toLowerCase(),
      $("#student-filter-grade").value,
      $("#student-filter-status").value
    );
    $("#student-search").addEventListener("input", update);
    $("#student-filter-grade").addEventListener("change", update);
    $("#student-filter-status").addEventListener("change", update);
    update();
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 9 — Historial                                                */
  /* ------------------------------------------------------------------ */
  function initHistoryView() {
    const studentSelect = $("#hist-filter-student");
    DATA.estudiantes.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id; opt.textContent = s.nombre;
      studentSelect.appendChild(opt);
    });
    const gradeSelect = $("#hist-filter-grade");
    [...new Set(DATA.estudiantes.map((s) => s.grado))].sort().forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g; opt.textContent = `Grado ${g}`;
      gradeSelect.appendChild(opt);
    });
    const deviceSelect = $("#hist-filter-device");
    DATA.dispositivos.forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.nombre.replace("-CAM", "");
      opt.textContent = d.nombre;
      deviceSelect.appendChild(opt);
    });

    const update = () => {
      const studentId = studentSelect.value;
      const grade = gradeSelect.value;
      const status = $("#hist-filter-status").value;
      const device = deviceSelect.value;

      const filtered = DATA.accesos.filter((a) => {
        const student = DATA.estudiantes.find((s) => s.id === a.estudianteId);
        const matchesStudent = !studentId || a.estudianteId === studentId;
        const matchesGrade = !grade || (student && student.grado === grade);
        const matchesStatus = !status || a.estado === status;
        const matchesDevice = !device || a.dispositivo === device;
        return matchesStudent && matchesGrade && matchesStatus && matchesDevice;
      });

      $("#history-list").innerHTML = filtered.map(recordRowHTML).join("");
      attachRecordRowEvents($("#history-list"));
      $("#history-empty").style.display = filtered.length ? "none" : "block";
    };

    [studentSelect, gradeSelect, $("#hist-filter-status"), deviceSelect, $("#hist-filter-date")]
      .forEach((el) => el.addEventListener("input", update));
    update();
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 10 — Reportes (gráficos SVG simples, sin dependencias)       */
  /* ------------------------------------------------------------------ */
  function drawBarChart(svgId, data, labelKey, valueKey, opts) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const W = 320, H = 160, padBottom = 24, padTop = 14, padSide = 10;
    const max = Math.max(...data.map((d) => d[valueKey])) * 1.15 || 1;
    const barGap = 14;
    const barWidth = (W - padSide * 2 - barGap * (data.length - 1)) / data.length;
    const warnMode = opts && opts.warn;

    let bars = "";
    data.forEach((d, i) => {
      const x = padSide + i * (barWidth + barGap);
      const h = ((H - padTop - padBottom) * d[valueKey]) / max;
      const y = H - padBottom - h;
      bars += `<rect class="chart-bar${warnMode ? " warn" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${h.toFixed(1)}" rx="4"/>`;
      bars += `<text class="chart-value-label" x="${(x + barWidth / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${d[valueKey]}</text>`;
      bars += `<text class="chart-axis-label" x="${(x + barWidth / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${d[labelKey]}</text>`;
    });
    svg.innerHTML = bars;
  }

  function renderReports() {
    drawBarChart("chart-attendance-day", DATA.reportes.asistenciaPorDia, "dia", "valor");
    drawBarChart("chart-entries-hour", DATA.reportes.ingresosPorHora, "hora", "valor");
    drawBarChart("chart-attendance-course", DATA.reportes.asistenciaPorCurso, "curso", "valor");
    drawBarChart("chart-failed-attempts", DATA.reportes.intentosFallidosPorDia, "dia", "valor", { warn: true });
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 11 — Alertas                                                 */
  /* ------------------------------------------------------------------ */
  function alertItemHTML(a) {
    const icons = {
      critico: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      advertencia: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      exito: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>',
    };
    return `
      <div class="alert-item ${a.nivel}">
        <span class="alert-item__icon">${icons[a.nivel] || icons.advertencia}</span>
        <div>
          <div class="alert-item__title">${a.titulo}</div>
          <div class="alert-item__desc">${a.descripcion}</div>
          <div class="alert-item__meta">${a.dispositivo} · ${a.hora}</div>
        </div>
      </div>`;
  }

  function renderAlerts() {
    $("#alerts-full-list").innerHTML = DATA.alertas.map(alertItemHTML).join("");
    const activeCount = DATA.alertas.filter((a) => a.nivel !== "exito").length;
    $("#alerts-badge").textContent = activeCount;
    if (!activeCount) $("#alerts-badge").style.display = "none";
  }

  /* ------------------------------------------------------------------ */
  /* Configuración — dispositivos                                        */
  /* ------------------------------------------------------------------ */
  function renderSettingsDevices() {
    $("#settings-devices-list").innerHTML = DATA.dispositivos.map((d) => `
      <div class="settings-row">
        <div>
          <div class="settings-row__label">${d.nombre}</div>
          <div class="settings-row__hint">${d.ubicacion}</div>
        </div>
        ${statusBadge(d.estado)}
      </div>
    `).join("");

    const reduceToggle = $("#settings-reduce-motion");
    reduceToggle.checked = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reduceToggle.addEventListener("change", () => {
      document.documentElement.style.setProperty(
        "--motion-quick", reduceToggle.checked ? "0.001ms" : "150ms"
      );
      toast(reduceToggle.checked ? "Animaciones reducidas activadas." : "Animaciones reducidas desactivadas.", "ok");
    });
  }

  /* ------------------------------------------------------------------ */
  /* Modal genérico                                                       */
  /* ------------------------------------------------------------------ */
  function showModal(html) {
    const overlay = $("#modal-overlay");
    const content = $("#modal-content");
    content.innerHTML = html;
    overlay.classList.add("is-active");
    const closeBtn = $("#modal-close-btn");
    closeBtn && closeBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", modalEscHandler);
  }
  function closeModal() {
    $("#modal-overlay").classList.remove("is-active");
    document.removeEventListener("keydown", modalEscHandler);
  }
  function modalEscHandler(e) { if (e.key === "Escape") closeModal(); }

  function initModal() {
    $("#modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") closeModal();
    });
    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-open-profile]");
      if (trigger) openStudentProfile(trigger.dataset.openProfile);
    });
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULO 12 — Registro Biométrico (antes "Enrolamiento")               */
  /* ------------------------------------------------------------------ */
  function bioGoToStep(step) {
    bioStep = step;
    $$(".biometric-step").forEach((el) => (el.style.display = "none"));
    $(`#bio-step-${step}`).style.display = "";

    $$(".stepper__step", $("#biometric-stepper")).forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle("is-done", n < step);
      el.classList.toggle("is-active", n === step);
      if (n < step) el.querySelector(".stepper__circle").innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>';
      else el.querySelector(".stepper__circle").textContent = n;
    });
  }

  function renderBioStudentList(filterText) {
    const list = $("#bio-student-list");
    const filtered = DATA.estudiantes.filter(
      (s) => !filterText || s.nombre.toLowerCase().includes(filterText) || s.id.includes(filterText)
    );
    list.innerHTML = filtered.map((s) => `
      <button type="button" class="student-picker-item${selectedBioStudent && selectedBioStudent.id === s.id ? " is-selected" : ""}" data-student-id="${s.id}">
        <span class="avatar sm">${s.iniciales}</span>
        <span>${s.nombre}</span>
        <span class="meta">${s.biometriaRegistrada ? "Ya registrado" : "Sin biometría"}</span>
      </button>
    `).join("");
    $$(".student-picker-item", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedBioStudent = DATA.estudiantes.find((s) => s.id === btn.dataset.studentId);
        renderBioStudentList($("#bio-student-search").value.trim().toLowerCase());
        $("#bio-next-1").disabled = false;
      });
    });
  }

  function initBiometricFlow() {
    renderBioStudentList("");
    $("#bio-student-search").addEventListener("input", (e) => renderBioStudentList(e.target.value.trim().toLowerCase()));

    $("#bio-next-1").addEventListener("click", () => {
      if (!selectedBioStudent) return;
      $("#bio-selected-student-label").textContent = `Registrando a: ${selectedBioStudent.nombre} (ID ${selectedBioStudent.id})`;
      bioGoToStep(2);
    });

    const facialBtn = $("#bio-method-facial");
    facialBtn.addEventListener("click", () => {
      facialBtn.setAttribute("aria-pressed", "true");
      $("#bio-next-2").disabled = false;
    });
    $("#bio-back-2").addEventListener("click", () => bioGoToStep(1));
    $("#bio-next-2").addEventListener("click", () => {
      resetCaptureUI();
      bioGoToStep(3);
    });
    $("#bio-back-3").addEventListener("click", () => bioGoToStep(2));

    $("#bio-capture-btn").addEventListener("click", runCaptureSimulation);
    $("#bio-restart").addEventListener("click", () => {
      selectedBioStudent = null;
      facialBtn.setAttribute("aria-pressed", "false");
      $("#bio-next-1").disabled = true;
      $("#bio-next-2").disabled = true;
      renderBioStudentList("");
      $("#bio-student-search").value = "";
      bioGoToStep(1);
    });
  }

  function resetCaptureUI() {
    const frame = $("#bio-camera-frame");
    frame.className = "camera-frame";
    $("#bio-camera-text").textContent = "Posicione su rostro";
    $("#bio-feedback").className = "feedback-line";
    $("#bio-feedback").textContent = "";
    $("#bio-capture-btn").disabled = false;
    $("#bio-capture-btn").textContent = "Capturar imagen";
  }

  function runCaptureSimulation() {
    const frame = $("#bio-camera-frame");
    const feedback = $("#bio-feedback");
    const captureBtn = $("#bio-capture-btn");

    captureBtn.disabled = true;
    frame.classList.add("is-scanning");
    $("#bio-camera-text").textContent = "Escaneando...";
    feedback.className = "feedback-line processing";
    feedback.textContent = "Procesando identificación...";

    setTimeout(() => {
      // Resultado simulado: mayormente éxito, con posibilidad de advertencia/error para
      // mostrar los tres estados de feedback que pide el módulo 12 del documento.
      const roll = Math.random();
      frame.classList.remove("is-scanning");

      if (roll < 0.72) {
        frame.classList.add("state-ok");
        feedback.className = "feedback-line ok";
        feedback.innerHTML = "✓ Imagen capturada correctamente";
        setTimeout(() => finishCapture("ok"), 700);
      } else if (roll < 0.9) {
        frame.classList.add("state-warn");
        $("#bio-camera-text").textContent = "Acérquese un poco más a la luz";
        feedback.className = "feedback-line warn";
        feedback.textContent = "Iluminación insuficiente";
        captureBtn.disabled = false;
        captureBtn.textContent = "Intentar de nuevo";
      } else {
        frame.classList.add("state-error");
        $("#bio-camera-text").textContent = "No se detectó un rostro";
        feedback.className = "feedback-line error";
        feedback.textContent = "Rostro no detectado";
        captureBtn.disabled = false;
        captureBtn.textContent = "Intentar de nuevo";
      }
    }, 1400);
  }

  function finishCapture() {
    $("#bio-result-title").textContent = "Imagen capturada correctamente";
    $("#bio-result-text").textContent = selectedBioStudent
      ? `${selectedBioStudent.nombre} ya puede acceder mediante reconocimiento facial.`
      : "El estudiante ya puede acceder mediante reconocimiento facial.";
    if (selectedBioStudent) selectedBioStudent.biometriaRegistrada = true;
    bioGoToStep(4);
    toast("Registro biométrico completado.", "ok");
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                             */
  /* ------------------------------------------------------------------ */
  async function init() {
    initLogin();
    initNav();
    initMobileNav();
    initModal();

    try {
      DATA = await loadData();
    } catch (err) {
      toast("No se pudieron cargar los datos de demostración.", "error");
      console.error(err);
      return;
    }

    renderDashboard();
    initAccessView();
    initStudentsView();
    initHistoryView();
    renderReports();
    renderAlerts();
    renderSettingsDevices();
    initBiometricFlow();
    simulateLiveAccess();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
