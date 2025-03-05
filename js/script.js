document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const paymentReceipt = document.getElementById('paymentReceipt');

  // Precios de las rutas actualizados
  const routePrices = {
    media168: 168000,
    media180: 180000,
    completa: 284000
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
          "Febrero": 250201,
          "Marzo": 250301,
          "Abril": 250401,
          "Mayo": 250501,
          "Junio": 250601,
          "Julio": 250701,
          "Agosto": 350801,
          "Septiembre": 250901,
          "Octubre": 251001,
          "Noviembre": 251101
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
    const printedKey = "receiptPrinted_" + paymentMonth;
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

    // Marcar que el comprobante ya fue impreso para este mes
    localStorage.setItem(printedKey, "true");

    // Imprimir el comprobante
    window.print();

    // Limpiar el formulario para el siguiente ingreso
    clearForm();
  });
});
