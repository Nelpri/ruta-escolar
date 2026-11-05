document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const paymentReceipt = document.getElementById('paymentReceipt');

  // Usar precios de la configuración centralizada
  const routePrices = (typeof CONFIG !== 'undefined' && CONFIG.PRICES)
    ? CONFIG.PRICES
    : {
        media180: 180000,
        completa295: 295000,
        completa: 310000
      };

  /**
   * Genera el número de comprobante para el mes seleccionado.
   * Se utiliza la base definida en CONFIG.RECEIPT_BASES (o un fallback)
   * y se incrementa en cada nueva impresión.
   */
  function generateReceiptNumber(month) {
    const baseNumbers = (typeof CONFIG !== 'undefined' && CONFIG.RECEIPT_BASES)
      ? CONFIG.RECEIPT_BASES
      : {
          "Febrero": 260201,
          "Marzo": 260301,
          "Abril": 260401,
          "Mayo": 260501,
          "Junio": 260601,
          "Julio": 260701,
          "Agosto": 260801,
          "Septiembre": 260901,
          "Octubre": 261001,
          "Noviembre": 261101
        };
    let counter = localStorage.getItem("receiptCounter_" + month);
    if (!counter) {
      counter = baseNumbers[month] || 0;
    } else {
      counter = parseInt(counter, 10);
    }
    const receiptNumber = counter;
    localStorage.setItem("receiptCounter_" + month, (counter + 1).toString());
    return receiptNumber;
  }

  /**
   * Limpia el formulario de inscripción y elimina los datos almacenados.
   */
  function clearForm() {
    form.reset();
    localStorage.removeItem('registrationData');
  }

  /**
   * Obtiene la lista de meses del período escolar
   */
  function getSchoolMonths() {
    return ['Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'];
  }

  /**
   * Obtiene el mes actual del período escolar (hasta el mes actual o hasta Noviembre)
   */
  function getCurrentMonth() {
    const months = getSchoolMonths();
    const currentDate = new Date();
    const currentMonthName = currentDate.toLocaleString('es-ES', { month: 'long' });
    const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);
    
    // Mapear nombres de meses en español
    const monthMap = {
      'Enero': 'Febrero',
      'Febrero': 'Febrero',
      'Marzo': 'Marzo',
      'Abril': 'Abril',
      'Mayo': 'Mayo',
      'Junio': 'Junio',
      'Julio': 'Julio',
      'Agosto': 'Agosto',
      'Septiembre': 'Septiembre',
      'Octubre': 'Octubre',
      'Noviembre': 'Noviembre',
      'Diciembre': 'Noviembre'
    };
    
    return monthMap[capitalizedMonth] || 'Noviembre';
  }

  /**
   * Obtiene los meses requeridos hasta el mes actual
   */
  function getRequiredMonths() {
    const allMonths = getSchoolMonths();
    const currentMonth = getCurrentMonth();
    const currentMonthIndex = allMonths.indexOf(currentMonth);
    return allMonths.slice(0, currentMonthIndex + 1);
  }

  /**
   * Obtiene el mes de inicio del alumno (primer mes con pago registrado)
   */
  function getStudentStartMonth(student) {
    if (!student || !student.payments || student.payments.length === 0) {
      return null;
    }
    
    const allMonths = getSchoolMonths();
    const paidMonths = student.payments.map(p => p.month);
    
    // Ordenar los meses pagados según el orden del período escolar
    const sortedPaidMonths = paidMonths.sort((a, b) => {
      return allMonths.indexOf(a) - allMonths.indexOf(b);
    });
    
    // Retornar el primer mes pagado (mes de inicio)
    return sortedPaidMonths[0];
  }

  /**
   * Obtiene los meses requeridos desde el mes de inicio del alumno hasta el mes actual
   */
  function getRequiredMonthsFromStart(startMonth) {
    const allMonths = getSchoolMonths();
    const currentMonth = getCurrentMonth();
    
    // Si no hay mes de inicio, retornar desde Febrero (comportamiento por defecto)
    if (!startMonth) {
      const currentMonthIndex = allMonths.indexOf(currentMonth);
      return allMonths.slice(0, currentMonthIndex + 1);
    }
    
    const startMonthIndex = allMonths.indexOf(startMonth);
    const currentMonthIndex = allMonths.indexOf(currentMonth);
    
    // Si el mes de inicio no está en la lista, retornar desde Febrero
    if (startMonthIndex === -1) {
      return allMonths.slice(0, currentMonthIndex + 1);
    }
    
    // Retornar meses desde el mes de inicio hasta el mes actual
    return allMonths.slice(startMonthIndex, currentMonthIndex + 1);
  }

  /**
   * Guarda un pago en el historial del alumno
   */
  function savePayment(studentName, paymentData) {
    const studentsKey = 'studentsPayments';
    let students = JSON.parse(localStorage.getItem(studentsKey) || '{}');
    
    // Reutilizar el registro existente del alumno (sin importar tildes, mayúsculas o espacios)
    const normalizedName = findStudentKey(students, studentName) || normalizeName(studentName);
    
    if (!students[normalizedName]) {
      students[normalizedName] = {
        studentName: studentName, // Guardar nombre original
        parentName: paymentData.parentName,
        email: paymentData.email,
        phone: paymentData.phone,
        routeType: paymentData.routeType,
        payments: []
      };
    }
    
    // Agregar el pago si no existe ya para ese mes
    const monthExists = students[normalizedName].payments.some(p => p.month === paymentData.paymentMonth);
    if (!monthExists) {
      students[normalizedName].payments.push({
        month: paymentData.paymentMonth,
        amount: routePrices[paymentData.routeType],
        date: new Date().toISOString(),
        receiptNumber: paymentData.receiptNumber
      });
      // Actualizar datos del alumno si han cambiado
      students[normalizedName].parentName = paymentData.parentName;
      students[normalizedName].email = paymentData.email;
      students[normalizedName].phone = paymentData.phone;
      students[normalizedName].routeType = paymentData.routeType;
    }
    
    localStorage.setItem(studentsKey, JSON.stringify(students));
  }

  /**
   * Busca un alumno por nombre
   */
  function normalizeName(name) {
    return (name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function findStudentKey(students, studentName) {
    const target = normalizeName(studentName);
    return Object.keys(students).find(k => normalizeName(students[k].studentName || k) === target) || null;
  }

  function findStudent(studentName) {
    const students = JSON.parse(localStorage.getItem('studentsPayments') || '{}');
    const target = normalizeName(studentName);
    const matches = Object.keys(students)
      .filter(k => normalizeName(students[k].studentName || k) === target)
      .map(k => students[k]);
    if (matches.length === 0) return null;

    // Si el alumno quedó guardado en varios registros, se unen sus pagos y motivos
    const merged = Object.assign({}, matches[0], { payments: [], pendingReasons: {} });
    matches.forEach(record => {
      (record.payments || []).forEach(p => {
        if (!merged.payments.some(x => x.month === p.month)) merged.payments.push(p);
      });
      Object.assign(merged.pendingReasons, record.pendingReasons || {});
    });
    return merged;
  }

  /**
   * Verifica si un alumno está al día con sus pagos
   */
  function checkStudentStatus(studentName) {
    const student = findStudent(studentName);
    if (!student) {
      return {
        found: false,
        isUpToDate: false,
        paidMonths: [],
        pendingMonths: [],
        studentData: null,
        startMonth: null,
        requiredMonths: []
      };
    }
    
    // Obtener el mes de inicio del alumno
    const startMonth = getStudentStartMonth(student);
    
    // Calcular los meses requeridos desde el mes de inicio hasta el mes actual
    const requiredMonths = getRequiredMonthsFromStart(startMonth);
    
    // Obtener los meses pagados (ordenados)
    const allMonths = getSchoolMonths();
    const paidMonths = student.payments.map(p => p.month);
    const sortedPaidMonths = paidMonths.sort((a, b) => {
      return allMonths.indexOf(a) - allMonths.indexOf(b);
    });
    
    // Calcular los meses pendientes
    const pendingMonths = requiredMonths.filter(month => !paidMonths.includes(month));
    const isUpToDate = pendingMonths.length === 0;
    
    return {
      found: true,
      isUpToDate: isUpToDate,
      paidMonths: sortedPaidMonths,
      pendingMonths: pendingMonths,
      studentData: student,
      startMonth: startMonth,
      requiredMonths: requiredMonths,
      currentMonth: getCurrentMonth()
    };
  }

  /**
   * Genera el comprobante de pago rellenando los campos correspondientes.
   * Se genera sin número de comprobante; este se asigna al confirmar la impresión.
   */
  function generateReceipt(data) {
    console.log("Generando comprobante con los siguientes datos:", data);
    
    // Rellenar los campos del comprobante
    document.getElementById('receiptStudentName').textContent = data.studentName;
    document.getElementById('receiptParentName').textContent = data.parentName;

    // Obtener el texto de la opción seleccionada en el select
    const routeSelect = document.getElementById('routeType');
    let selectedOption = routeSelect.options[routeSelect.selectedIndex];
    
    // Si no hay opción seleccionada, buscar la opción cuyo value coincida con data.routeType
    if (!selectedOption || routeSelect.selectedIndex === -1) {
      for (let option of routeSelect.options) {
        if (option.value === data.routeType) {
          selectedOption = option;
          break;
        }
      }
    }
    
    if (selectedOption) {
      const selectedText = selectedOption.text;
      document.getElementById('receiptRouteType').textContent = selectedText;
    } else {
      document.getElementById('receiptRouteType').textContent = 'N/A';
      console.error("No se encontró la opción seleccionada en 'routeType'.");
    }

    // Validar y formatear el precio
    const amount = routePrices[data.routeType];
    if (amount) {
      document.getElementById('receiptAmount').textContent = amount.toLocaleString('es-CO');
    } else {
      document.getElementById('receiptAmount').textContent = '0';
      console.error("No se encontró el precio para el tipo de ruta:", data.routeType);
    }

    document.getElementById('receiptMonth').textContent = data.paymentMonth;

    // Mostrar el comprobante
    paymentReceipt.classList.add('receipt-visible');
    console.log("Comprobante generado y visible.");

    // Realizar scroll suave al comprobante
    paymentReceipt.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  // Si hay datos almacenados, se rellenan los campos y se genera el comprobante automáticamente
  const storedData = localStorage.getItem('registrationData');
  if (storedData) {
    try {
      const data = JSON.parse(storedData);
      document.getElementById('studentName').value = data.studentName || '';
      document.getElementById('parentName').value = data.parentName || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('phone').value = data.phone || '';
      document.getElementById('routeType').value = data.routeType || '';
      document.getElementById('paymentMonth').value = data.paymentMonth || '';
      generateReceipt(data);
    } catch (error) {
      console.error("Error al parsear los datos almacenados:", error);
    }
  }

  // Evento de envío del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Recopilar los valores del formulario
    const formData = {
      studentName: document.getElementById('studentName').value.trim(),
      parentName: document.getElementById('parentName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      routeType: document.getElementById('routeType').value,
      paymentMonth: document.getElementById('paymentMonth').value
    };

    // Validar que se hayan seleccionado el tipo de ruta y el mes
    if (!formData.routeType) {
      alert('Por favor seleccione un tipo de ruta');
      return;
    }
    if (!formData.paymentMonth) {
      alert('Por favor seleccione el mes de cancelación');
      return;
    }

    console.log("Datos del formulario enviados:", formData);

    // Guardar los datos en localStorage
    localStorage.setItem('registrationData', JSON.stringify(formData));

    // Generar el comprobante de pago (sin número de comprobante aún)
    generateReceipt(formData);
  });

  // Botón para imprimir el comprobante (se imprimirá solo el comprobante gracias a las reglas CSS)
  document.getElementById('downloadReceipt').addEventListener('click', () => {
    const paymentMonth = document.getElementById('paymentMonth').value;
    if (!paymentMonth) {
      alert("Mes de cancelación no seleccionado.");
      return;
    }
    const printedKey = "receiptPrinted_" + normalizeName(document.getElementById('receiptStudentName').textContent) + "_" + paymentMonth;
    const alreadyPrinted = localStorage.getItem(printedKey);

    if (alreadyPrinted) {
      // Si ya se imprimió, preguntar autorización para reimprimir
      const reprint = confirm("El comprobante ya fue impreso para este mes. ¿Desea reimprimir con autorización del conductor?");
      if (!reprint) {
        return;
      }
    } else {
      // Confirmación del conductor para imprimir
      const confirmPayment = confirm("¿El conductor confirma el pago?");
      if (!confirmPayment) {
        return;
      }
    }

    // Generar y asignar el número de comprobante
    const receiptNumber = generateReceiptNumber(paymentMonth);
    document.getElementById('receiptNumber').textContent = receiptNumber;

    // Obtener los datos del formulario para guardar el pago
    const studentName = document.getElementById('receiptStudentName').textContent;
    const parentName = document.getElementById('receiptParentName').textContent;
    
    // Intentar obtener datos del formulario, si no están disponibles, obtenerlos de localStorage
    let email = document.getElementById('email').value.trim();
    let phone = document.getElementById('phone').value.trim();
    let routeType = document.getElementById('routeType').value;
    
    // Si los campos del formulario están vacíos, intentar obtenerlos de localStorage
    if (!email || !phone || !routeType) {
      const storedData = localStorage.getItem('registrationData');
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          email = email || data.email || '';
          phone = phone || data.phone || '';
          routeType = routeType || data.routeType || '';
        } catch (error) {
          console.error("Error al parsear los datos almacenados:", error);
        }
      }
    }
    
    const formData = {
      studentName: studentName,
      parentName: parentName,
      email: email,
      phone: phone,
      routeType: routeType,
      paymentMonth: paymentMonth,
      receiptNumber: receiptNumber
    };

    // Guardar el pago en el historial del alumno
    savePayment(studentName, formData);

    // Marcar que el comprobante ya fue impreso para este mes
    localStorage.setItem(printedKey, "true");

    // Imprimir el comprobante
    window.print();

    // Limpiar el formulario para el siguiente ingreso
    clearForm();
  });

  // ========== FUNCIONALIDAD DE PAZ Y SALVO ==========

  const pazSalvoForm = document.getElementById('pazSalvoForm');
  const pazSalvoResult = document.getElementById('pazSalvoResult');
  const pazSalvoDocument = document.getElementById('pazSalvoDocument');

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Guarda en el historial del alumno el motivo de cada mes sin pago
   */
  function savePendingReasons(studentName, reasons) {
    const students = JSON.parse(localStorage.getItem('studentsPayments') || '{}');
    const key = findStudentKey(students, studentName);
    if (!key) return;
    students[key].pendingReasons = Object.assign(students[key].pendingReasons || {}, reasons);
    localStorage.setItem('studentsPayments', JSON.stringify(students));
  }

  /**
   * Registra como pagado un mes que no quedó guardado (pago sin comprobante en la app)
   */
  function registerManualPayment(studentName, month) {
    const students = JSON.parse(localStorage.getItem('studentsPayments') || '{}');
    const key = findStudentKey(students, studentName);
    if (!key) return;
    const record = students[key];
    if (!record.payments.some(p => p.month === month)) {
      record.payments.push({
        month: month,
        amount: routePrices[record.routeType],
        date: new Date().toISOString(),
        receiptNumber: '',
        manual: true
      });
      localStorage.setItem('studentsPayments', JSON.stringify(students));
    }
  }

  function showPazSalvoDocument(status, reasons) {
    generatePazSalvo(status, reasons);
    pazSalvoResult.style.display = 'none';
    pazSalvoDocument.style.display = 'block';
    pazSalvoDocument.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Muestra el formulario para escribir el motivo de cada mes pendiente
   */
  function showPendingReasonsForm(status) {
    const student = status.studentData;
    const saved = student.pendingReasons || {};
    const periodText = status.startMonth
      ? `desde ${status.startMonth} hasta ${status.currentMonth}`
      : `hasta ${status.currentMonth}`;

    const fields = status.pendingMonths.map(month => `
      <div class="form-group">
        <label for="reason-${month}">${month}</label>
        <label class="paid-check">
          <input type="checkbox" data-paid="${month}"> Este mes sí está pagado
        </label>
        <input type="text" id="reason-${month}" data-month="${month}" list="reasonSuggestions"
               maxlength="150" placeholder="Motivo por el que no se pagó">
      </div>`).join('');

    pazSalvoResult.innerHTML = `
      <div class="alert alert-warning">
        <p>⚠️ El alumno <strong>${escapeHtml(student.studentName)}</strong> tiene meses sin pagar.</p>
        <p><strong>Período:</strong> ${periodText} 2026</p>
        <p><strong>Meses pagados:</strong> ${status.paidMonths.length > 0 ? status.paidMonths.join(', ') : 'Ninguno'}</p>
        <p><strong>Meses pendientes:</strong> ${status.pendingMonths.join(', ')}</p>
        <p>Si un mes sí fue pagado, márquelo como pagado. Si no, escriba el motivo.</p>
        <form id="pendingReasonsForm" novalidate>
          ${fields}
          <p class="reason-error" id="reasonError" role="alert"></p>
          <button type="submit" class="btn">Generar Paz y Salvo con observaciones</button>
        </form>
      </div>
    `;
    pazSalvoResult.querySelectorAll('input[data-month]').forEach(input => {
      input.value = saved[input.dataset.month] || '';
    });
    pazSalvoResult.style.display = 'block';
    pazSalvoDocument.style.display = 'none';

    pazSalvoResult.querySelectorAll('input[data-paid]').forEach(box => {
      box.addEventListener('change', () => {
        const input = document.getElementById('reason-' + box.dataset.paid);
        input.disabled = box.checked;
        if (box.checked) input.classList.remove('input-error');
      });
    });

    document.getElementById('pendingReasonsForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const reasons = {};
      const nowPaid = [];
      const missing = [];
      pazSalvoResult.querySelectorAll('input[data-month]').forEach(input => {
        const month = input.dataset.month;
        const box = pazSalvoResult.querySelector(`input[data-paid="${month}"]`);
        if (box.checked) {
          nowPaid.push(month);
          return;
        }
        const reason = input.value.trim();
        input.classList.toggle('input-error', !reason);
        if (reason) {
          reasons[month] = reason;
        } else {
          missing.push(month);
        }
      });
      if (missing.length > 0) {
        document.getElementById('reasonError').textContent = `Falta el motivo de: ${missing.join(', ')}.`;
        return;
      }
      nowPaid.forEach(month => registerManualPayment(student.studentName, month));
      savePendingReasons(student.studentName, reasons);
      showPazSalvoDocument(checkStudentStatus(student.studentName), reasons);
    });
  }

  if (pazSalvoForm) {
    pazSalvoForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const studentName = document.getElementById('pazSalvoStudentName').value.trim();
      if (!studentName) {
        alert('Por favor ingrese el nombre del alumno');
        return;
      }

      const status = checkStudentStatus(studentName);

      if (!status.found) {
        pazSalvoResult.innerHTML = `
          <div class="alert alert-error">
            <p>❌ No se encontró ningún registro para el alumno: <strong>${escapeHtml(studentName)}</strong></p>
            <p>Por favor verifique que el nombre esté correcto o que el alumno tenga pagos registrados.</p>
          </div>
        `;
        pazSalvoResult.style.display = 'block';
        pazSalvoDocument.style.display = 'none';
        return;
      }

      if (!status.isUpToDate) {
        showPendingReasonsForm(status);
        return;
      }

      showPazSalvoDocument(status, {});
    });
  }

  /**
   * Genera el documento de paz y salvo (al día o con observaciones)
   */
  function generatePazSalvo(status, reasons = {}) {
    const studentData = status.studentData;
    const paidMonths = status.paidMonths;
    const pendingMonths = status.pendingMonths;
    const hasPending = pendingMonths.length > 0;
    const startMonth = status.startMonth;
    const currentMonth = status.currentMonth;

    const formattedDate = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const routeTypeMap = {
      'media180': 'Media Ruta - $180,000',
      'completa295': 'Ruta completa - $295,000',
      'completa': 'Ruta Completa - $310,000'
    };
    const routeTypeText = routeTypeMap[studentData.routeType] || studentData.routeType;

    let periodText = 'Febrero - Noviembre 2026';
    if (startMonth && currentMonth) {
      periodText = startMonth === currentMonth
        ? `${startMonth} 2026`
        : `${startMonth} - ${currentMonth} 2026`;
    }

    const setText = (id, value) => { document.getElementById(id).textContent = value; };
    const setHidden = (id, value) => { document.getElementById(id).hidden = value; };

    setText('pazSalvoDocStudentName', studentData.studentName);
    setText('pazSalvoDocParentName', studentData.parentName);
    setText('pazSalvoDocRouteType', routeTypeText);
    setText('pazSalvoDocDate', formattedDate);
    setText('pazSalvoDocMonths', paidMonths.length > 0 ? paidMonths.join(', ') : 'Ninguno');
    setText('pazSalvoDocTotalMonths', paidMonths.length);
    setText('pazSalvoDocPeriod', periodText);
    setText('pazSalvoDocPeriodPending', periodText);
    setText('pazSalvoDocTotalPending', pendingMonths.length);

    // Alternar entre versión "al día" y versión "con observaciones"
    setHidden('pazSalvoSubtitle', !hasPending);
    setHidden('pazSalvoBodyUpToDate', hasPending);
    setHidden('pazSalvoBodyPending', !hasPending);
    setHidden('pazSalvoPendingLine', !hasPending);
    setHidden('pazSalvoPendingBlock', !hasPending);
    setText('pazSalvoFooter', hasPending
      ? 'Se expide el presente PAZ Y SALVO con las observaciones consignadas, para los fines que al interesado convengan.'
      : 'Por lo tanto, se expide el presente PAZ Y SALVO para los fines que al interesado convengan.');

    // Tabla de meses sin pagar con su motivo
    const tbody = document.getElementById('pazSalvoPendingBody');
    tbody.innerHTML = '';
    pendingMonths.forEach(month => {
      const row = document.createElement('tr');
      const monthCell = document.createElement('td');
      const reasonCell = document.createElement('td');
      monthCell.textContent = month;
      reasonCell.textContent = reasons[month] || '';
      row.append(monthCell, reasonCell);
      tbody.appendChild(row);
    });
  }

  // Botón para imprimir/descargar el paz y salvo
  const downloadPazSalvoBtn = document.getElementById('downloadPazSalvo');
  if (downloadPazSalvoBtn) {
    downloadPazSalvoBtn.addEventListener('click', () => {
      document.body.classList.add('print-paz-salvo');
      window.print();
    });
  }
  window.addEventListener('afterprint', () => {
    document.body.classList.remove('print-paz-salvo');
  });
});