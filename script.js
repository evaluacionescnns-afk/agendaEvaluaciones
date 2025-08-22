emailjs.init('2eMfdE1GQKr8lsBkC');

document.addEventListener('DOMContentLoaded', () => {
    const monthNames = ["Septiembre", "Octubre"];
    const year = 2025;
    let currentMonth = 0;
    const enabledDates = {};
    const calendarContainer = document.getElementById('calendar-container');
    const flechaAtras = document.getElementById("flecha-atras");
    const flechaAdelante = document.getElementById("flecha-adelante");
    const mesLabel = document.getElementById("month");
    const calendarDays = document.getElementById("calendar-days");
    const loginWrapper = document.getElementById('login-wrapper');
    const loginForm = document.getElementById('login-container');
    const ciInput = document.getElementById('ci');
    const errorMsg = document.getElementById('error-msg');
    let usuarioActualCI = null;
    let nombreUsuario = null;
    let botonActivo = null;
    let maxGruposPermitidos = 0; 
    let usuarioTipo = null;  

    // Modal bootstrap
    const modalEl = document.getElementById('modalConfirmacion');
    const modal = new bootstrap.Modal(modalEl);
    const modalMensaje = document.getElementById('modalConfirmacionMensaje');
    const btnConfirmar = document.getElementById('modalConfirmarBtn');
    const btnCancelar = document.getElementById('modalCancelarBtn');

    function daysInMonth(month, year) {
        return new Date(year, month + 1, 0).getDate();
    }

    function firstDayOfMonth(month, year) {
        return new Date(year, month, 1).getDay();
    }

    function formatearFechaSinComa(fecha) {
        const partes = new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
        }).formatToParts(fecha);

        const nombreDia = partes.find(p => p.type === 'weekday')?.value || '';
        const dia = partes.find(p => p.type === 'day')?.value || '';
        const mes = partes.find(p => p.type === 'month')?.value || '';
        const nombreDiaCap = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
        return `${nombreDiaCap} ${dia} de ${mes}`;
    }

    function dibujarDias() {
        calendarDays.innerHTML = "";

        const baseMonth = 8;
        const jsMonth = baseMonth + currentMonth;

        const firstDay = firstDayOfMonth(jsMonth, year);
        const totalDays = daysInMonth(jsMonth, year);
        const mesActualKey = `${year}-${String(jsMonth + 1).padStart(2, '0')}`;

        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement("div");
            calendarDays.appendChild(emptyCell);
        }

        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement("div");
            dayCell.textContent = day;

            if (enabledDates[mesActualKey] && enabledDates[mesActualKey].includes(Number(day)) && (day !== 19)) {
                dayCell.classList.add("enabled-days");
                dayCell.style.cursor = "pointer";
                dayCell.addEventListener("click", () => {
                    seleccionarDia(year, jsMonth, day);
                });
            } else {
                dayCell.classList.add("not-enabled-days");
            }

            calendarDays.appendChild(dayCell);
        }
    }

    function seleccionarDia(year, month, day) {
        fechaSeleccionada.year = year;
        fechaSeleccionada.month = month;
        fechaSeleccionada.day = day;

        document.querySelectorAll(".selected-day").forEach(el => el.classList.remove("selected-day"));

        document.querySelectorAll("#calendar-days div").forEach(cell => {
        if (parseInt(cell.textContent) === day && cell.classList.contains("enabled-days")) {
            cell.classList.add("selected-day");
        }
        });

        const h5 = document.getElementById("fecha-seleccionada");
        const hr = document.getElementById("separador-fecha");
        if (!h5 || !hr) return;

        const fecha = new Date(year, month, day);
        h5.textContent = formatearFechaSinComa(fecha);
        h5.style.display = 'block';
        hr.style.display = 'block';

        cargarGruposDelDia(fecha);
    }

    function actualizarUI() {
        mesLabel.textContent = monthNames[currentMonth];
        flechaAtras.classList.toggle("oculto", currentMonth === 0);
        flechaAdelante.classList.toggle("oculto", currentMonth === monthNames.length - 1);
        dibujarDias();
    }

    flechaAtras.addEventListener("click", () => {
        if (currentMonth > 0) {
        currentMonth--;
        actualizarUI();
        }
    });

    flechaAdelante.addEventListener("click", () => {
        if (currentMonth < monthNames.length - 1) {
        currentMonth++;
        actualizarUI();
        }
    });

    async function cargarFechasDesdeSupabase() {
        const { data, error } = await supabase
        .from('grupos')
        .select('hora_inicio, hora_fin');

        if (error) {
        console.error('Error al traer datos de grupos:', error);
        return;
        }

        data.forEach(grupo => {
        const fechas = [grupo.hora_inicio, grupo.hora_fin];
        fechas.forEach(f => {
            if (f) {
            const fecha = new Date(f);
            const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            const dia = fecha.getDate();
            if (!enabledDates[key]) {
                enabledDates[key] = [];
            }
            if (!enabledDates[key].includes(dia)) {
                enabledDates[key].push(dia);
            }
            }
        });
        });

        actualizarUI();
    }

    async function obtenerCvpaUsuario(usuarioCI) {
        const { data, error } = await supabase
        .from('integrantes')
        .select('cvpa, div3')
        .eq('ci', usuarioCI)
        .single();

        if (error) {
        console.error('Error al obtener cvpa:', error);
        return 0;
        }

        return data?.cvpa || 0;
    }

    const fechaSeleccionada = { year: null, month: null, day: null };

    async function contarGruposAgendados() {
        const { data, error } = await supabase
        .from('inscripciones')
        .select('id')
        .eq('integranteID', usuarioActualCI);

        if (error) {
        console.error('Error al contar inscripciones:', error);
        return 0;
        }
        return data.length;
    }

    async function obtenerTipoUsuario(usuarioCI) {
        const { data, error } = await supabase
            .from('integrantes')
            .select('div3')
            .eq('ci', usuarioCI)
            .single();

        if (error) {
            console.error('Error al obtener div3:', error);
            usuarioTipo = null;
            return;
        }

        if (!data || !data.div3) {
            usuarioTipo = null;
            return;
        }

        switch (data.div3) {
            case 1:
                usuarioTipo = "PI";
                break;
            case 2:
                usuarioTipo = "PD";
                break;
            case 3:
                usuarioTipo = "M";
                break;
            default:
                usuarioTipo = null;
        }

        return usuarioTipo;
    }

    async function modificarCupoGrupoPorUsuarioTipo(grupoID, usuarioTipo) {
        let columna;
        switch (usuarioTipo) {
            case "PI":
            columna = "cupoPI";
            break;
            case "PD":
            columna = "cupoPD";
            break;
            case "M":
            columna = "cupoM";
            break;
            default:
            console.error("Tipo de usuario no reconocido");
            return;
        }

        const { data, error } = await supabase
            .from("grupos")
            .select(columna)
            .eq("id", grupoID)
            .single();

        if (error) {
            console.error("Error al obtener cupo:", error);
            return;
        }

        const cupoActual = data ? data[columna] : null;

        if (cupoActual === null) {
            console.error('No se pudo obtener el cupo actual');
            return;
        }

        let errorUpdate;

        if (cupoActual === 1) {
            // Restamos 1 al cupo
            const { errorResta } = await supabase
                .from("grupos")
                .update({ [columna]: cupoActual - 1 })
                .eq("id", grupoID);
            errorUpdate = errorResta;
        } else {
            // Sumamos 1 al cupo
            const { errorSuma } = await supabase
                .from("grupos")
                .update({ [columna]: cupoActual + 1 })
                .eq("id", grupoID);
            errorUpdate = errorSuma;
        }

        if (errorUpdate) {
            console.error("Error al actualizar cupo:", errorUpdate);
        }
 
    }

    async function sumarCupos(grupoID){
        const { data, error } = await supabase
            .from("grupos")
            .select("cupoPI, cupoPD, cupoM")
            .eq("id", grupoID)
            .single();

            if (error) {
                console.error("Error al obtener cupos:", error);
                return null;
            }

            if (!data) {
                console.error("No se encontró el grupo con id:", grupoID);
                return null;
            }

        let total = data.cupoPI + data.cupoPD + data.cupoM;
        return total;
    }

    async function obtenerNivelPermisos(ci){
        const { data, error } = await supabase
            .from("integrantes")
            .select("nivel_permisos")
            .eq("ci", ci)
            .single();

        if (error) {
            console.error("Error al obtener nivel permisos:", error);
            return null;
        }

        if (!data) {
            console.error("No se encontró información sobre nivel permisos de: ", ci);
            return null;
        }

        const nivelPermisoIntegrante = data.nivel_permisos;
        return nivelPermisoIntegrante;
    }

    function mostrarModalSoloOk(mensaje) {
        modalMensaje.textContent = mensaje;
        btnConfirmar.textContent = "OK";
        btnCancelar.style.display = "none";
        btnConfirmar.onclick = () => {
            modal.hide();
        };
        modal.show();
    }

    function mostrarModalConfirmacion(mensaje, onConfirm) {
        modalMensaje.textContent = mensaje;
        btnConfirmar.textContent = "Confirmar";
        btnCancelar.style.display = "inline-block";
        btnConfirmar.onclick = onConfirm;
        modal.show();
    }

    async function obtenerCupoGrupoPorUsuarioTipo(grupoID) {
        if (!usuarioTipo) {
            console.error("usuarioTipo no definido");
            return 0;
        }

        let columna = null;
        switch (usuarioTipo) {
            case "PI":
            columna = "cupoPI";
            break;
            case "PD":
            columna = "cupoPD";
            break;
            case "M":
            columna = "cupoM";
            break;
            default:
            console.error("usuarioTipo desconocido:", usuarioTipo);
            return 0;
        }

        const { data, error } = await supabase
            .from("grupos")
            .select(columna)
            .eq("id", grupoID)
            .single();

        if (error) {
            console.error("Error al obtener cupo del grupo:", error);
            return 0;
        }

        return data ? data[columna] || 0 : 0;
    }

    async function actualizarEstadoBotones() {
    const gruposAgendados = await contarGruposAgendados(usuarioActualCI);
    const maxGruposPermitidos = await obtenerCvpaUsuario(usuarioActualCI);

    const botones = document.querySelectorAll('.reserve');

    botones.forEach(boton => {
        const estaAgendado = boton.classList.contains('btn-success');

        if (gruposAgendados >= maxGruposPermitidos && !estaAgendado) {
            boton.disabled = true;
            boton.classList.remove('btn-outline-primary');
            boton.classList.add('btn-secondary'); // opcional, más claro
        } else if (!estaAgendado) {
            boton.disabled = false;
            boton.classList.remove('btn-secondary');
            boton.classList.add('btn-outline-primary');
            boton.textContent = 'Agendarme';
        }
    });
}



    async function actualizarIntegrantesGrupo(grupoId) {
        const { data: inscriptos, error } = await supabase
            .from("inscripciones")
            .select("integrantes (nombre)")
            .eq("grupoID", grupoId);

        if (error) {
            console.error("Error actualizando integrantes del grupo:", error);
            return;
        }

        let integrantesHTML = "";
        if (inscriptos && inscriptos.length > 0) {
            integrantesHTML = inscriptos.map(row => `<li>${row.integrantes.nombre}</li>`).join("");
        } else {
            integrantesHTML = "<li>Todavía no hay integrantes en este grupo</li>";
        }

        const grupoElemento = document.querySelector(`.accordion-item[data-grupo-id="${grupoId}"]`);
        if (grupoElemento) {
            const listaIntegrantes = grupoElemento.querySelector(".accordion-body ul");
            if (listaIntegrantes) {
            listaIntegrantes.innerHTML = integrantesHTML;
            }
        }
    }


    async function obtenerDirMailIntegrantes(grupoID) {

        const { data: inscripciones, error: errorInscripciones } = await supabase
            .from("inscripciones")
            .select("integranteID")
            .eq("grupoID", grupoID);

        if (errorInscripciones) {
            console.error("Error obteniendo inscripciones:", errorInscripciones);
            return [];
        }

        const ids = inscripciones.map(item => item.integranteID);

        if (ids.length === 0) {
            console.log("No hay integrantes en este grupo");
            return [];
        }

        const { data: integrantes, error: errorIntegrantes } = await supabase
            .from("integrantes")
            .select("mail")
            .in("ci", ids);

        if (errorIntegrantes) {
            console.error("Error obteniendo mails:", errorIntegrantes);
            return [];
        }

        const mails = integrantes.map(item => item.mail);

        return mails;
    }

    async function enviarCorreo(email, grupo, diaGrupo, horaGrupo) {
        const params = {
            email: email,
            grupo: grupo,
            dia_grupo: diaGrupo,
            hora_grupo: horaGrupo,
        };
        
         try {
            const response = await emailjs.send(
                'service_id5h8i9',
                'template_a9cc0oa',
                params
            );
            console.log('Correo enviado', response.status, response.text);

        } catch (error) {
            console.error('Error al enviar correo', error);
        }
     }

    async function obtenerMapaIntegrantes() {
        const { data, error } = await supabase
            .from("integrantes")
            .select("ci, nombre");

        if (error) {
            console.error("Error al obtener integrantes:", error);
            return {};
        }

        const mapa = {};
        data.forEach(integrante => {
            mapa[integrante.ci] = integrante.nombre;
        });
        return mapa;
    }

    async function exportarExcel() {
        const { data: grupos } = await supabase
            .from("grupos")
            .select("id")
            .order("id", { ascending: true });

        const response = await fetch("xls/CuadernoEvaluacionesCNNS2025.xlsx");
        const arrayBuffer = await response.arrayBuffer();
        const workbook = await XlsxPopulate.fromDataAsync(arrayBuffer);
        const sheet = workbook.sheet(0);

        const div3Order = [1, 3, 2];
        let filaActual = 4;

        for (const grupo of grupos) {
            const { data: inscripciones } = await supabase
            .from("inscripciones")
            .select("integranteID")
            .eq("grupoID", grupo.id);

            if (!inscripciones || inscripciones.length === 0) {
                filaActual += div3Order.length;
                continue;
            }

            const idsIntegrantes = inscripciones.map((i) => i.integranteID);

            const { data: integrantes } = await supabase
                .from("integrantes")
                .select("ci, div3, nombre")
                .in("ci", idsIntegrantes);

            let posiciones = { 1: null, 3: null, 2: null };

            integrantes.forEach((int) => {
                posiciones[int.div3] = int.nombre || int.ci;
            });

            div3Order.forEach((div3) => {
                const valor = posiciones[div3];
                if (valor) {
                    sheet.cell(`C${filaActual}`).value(valor); 
                }
                filaActual++;
            });
        }

        const blob = await workbook.outputAsync();
        const url = URL.createObjectURL(new Blob([blob]));
        const a = document.createElement("a");
        a.href = url;
        a.download = "integrantes_por_grupo.xlsx";
        a.click();
    }

    let ci;
    let nivelPermiso;
    let tipoUsuario;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        ci = ciInput.value.trim();

        if (!/^\d+$/.test(ci)) {
        errorMsg.textContent = "No ingrese letras ni caracteres especiales";
        errorMsg.style.display = 'block';
        return;
        }

        if (ci.length !== 8) {
        errorMsg.textContent = "Debe ingresar 8 dígitos";
        errorMsg.style.display = 'block';
        return;
        }

        try {
        const { data, error } = await supabase
            .from("integrantes")
            .select("ci, nombre")
            .eq("ci", ci);

        if (error) {
            console.error("Error al consultar Supabase:", error);
            errorMsg.textContent = "Ocurrió un error al verificar la cédula.";
            errorMsg.style.display = 'block';
            return;
        }

        if (!data || data.length === 0) {
            errorMsg.textContent = "La cédula ingresada no está habilitada para acceder";
            errorMsg.style.display = 'block';
            return;
        }

        usuarioActualCI = ci;
        tipoUsuario = await obtenerTipoUsuario(usuarioActualCI); 

        nombreUsuario = data[0].nombre;
        //maxGruposPermitidos = await obtenerCvpaUsuario();

        errorMsg.style.display = 'none';
        loginWrapper.style.display = 'none';
        calendarContainer.style.display = 'block';

       nivelPermiso = await obtenerNivelPermisos(ci);
        if (nivelPermiso !== 1) {
            //  Nombre integrante
            const nombreIntegrante = document.getElementById('nombreOIExcel');
            nombreIntegrante.textContent = nombreUsuario; 
        }else{
            // Icono excel
            const iconoExcel = document.getElementById('nombreOIExcel');
            iconoExcel.innerHTML = `<img src="./imgs/excel.png" alt="Exportar a Excel" style="width:20px; height:20px;">`;
            iconoExcel.classList.add('icono-excel');

            iconoExcel.onclick = async () => {
                await exportarExcel();
            };
        }

        await cargarFechasDesdeSupabase();
        actualizarUI();

        } catch (err) {
        console.error("Error inesperado:", err);
        errorMsg.textContent = "Ocurrió un error inesperado.";
        errorMsg.style.display = 'block';
        }
    });


    async function cargarGruposDelDia(fecha) {
        const contenedor = document.getElementById("accordionFlushExample");
        contenedor.innerHTML = "";

        const yyyy = fecha.getFullYear();
        const mm = String(fecha.getMonth() + 1).padStart(2, "0");
        const dd = String(fecha.getDate()).padStart(2, "0");
        const fechaISO = `${yyyy}-${mm}-${dd}`;

        const { data: grupos, error } = await supabase
            .from("grupos")
            .select("*")
            .gte("hora_inicio", `${fechaISO}T00:00:00`)
            .lte("hora_inicio", `${fechaISO}T23:59:59`)
            .order("hora_inicio", { ascending: true });

        if (error) {
            console.error("Error cargando grupos del día:", error);
            return;
        }

        if (!grupos || grupos.length === 0) {
            contenedor.innerHTML = "<p class='text-center'>No hay grupos para este día.</p>";
            return;
        }

        const grupoIDs = grupos.map(g => g.id);
        let inscripcionesUsuario = [];
        if (usuarioActualCI) {
            const { data: inscData, error: errorInsc } = await supabase
                .from('inscripciones')
                .select('id, grupoID')
                .eq('integranteID', usuarioActualCI)
                .in('grupoID', grupoIDs);

            if (errorInsc) {
                console.error("Error cargando inscripciones del usuario:", errorInsc);
            } else {
                inscripcionesUsuario = inscData || [];
            }
        }
 
        for (let i = 0; i < grupos.length; i++) {
            const grupo = grupos[i];
            const id = `flush-collapse-${i}`;
            const nombreGrupo = grupo.descripcion || `Grupo ${i + 1}`;
            const horaInicio = new Date(grupo.hora_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const horaFin = new Date(grupo.hora_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const { data: inscriptos } = await supabase
                .from("inscripciones")
                .select("integrantes (nombre)")
                .eq("grupoID", grupo.id);

            let integrantesHTML = "";
            if (inscriptos && inscriptos.length > 0) {
                integrantesHTML = inscriptos.map(row => `<li>${row.integrantes.nombre}</li>`).join("");
            } else {
                integrantesHTML = "<li>Todavía no hay integrantes en este grupo</li>";
            }

            const inscripcionUsuario = inscripcionesUsuario.find(insc => insc.grupoID === grupo.id);
            const estaInscripto = !!inscripcionUsuario;
            const dataInscripcionIdAttr = estaInscripto ? `data-inscripcion-id="${inscripcionUsuario.id}"` : '';
            let botonOIconoHTML = "";

             let totalCupos = await sumarCupos(grupo.id);
             let botonClase;
             const botonTexto = estaInscripto ? 'Cancelar' : 'Agendarme';             
             if (totalCupos !== 0){
                botonClase = estaInscripto ? 'btn-success' : 'btn-outline-primary';                
             }else{
                botonClase = 'btn-hidden';
             }           


            if (nivelPermiso === 1) {
                
                botonOIconoHTML = `
                    <img 
                        src="./imgs/editar.png" 
                        alt="Editar" 
                        class="icono-editar" 
                        data-grupo-id="${grupo.id}" 
                        style="width: 20px; height: 20px; cursor: pointer;"
                    >
                `;

            }else{
                botonOIconoHTML = `
                <button class="btn btn-sm reserve ${botonClase}" ${dataInscripcionIdAttr}>${botonTexto}</button>
            `;
            }
            

            contenedor.innerHTML += `
                <div class="accordion-item" data-grupo-id="${grupo.id}">
                <h2 class="accordion-header">
                    <div class="accordion-header-content d-flex justify-content-between align-items-center w-100">
                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${id}" aria-expanded="false" aria-controls="${id}">
                        ${nombreGrupo} |&nbsp; <b>${horaInicio} - ${horaFin}</b>
                    </button>
                    ${botonOIconoHTML}
                    </div>
                </h2>
                <div id="${id}" class="accordion-collapse collapse" data-bs-parent="#accordionFlushExample">
                    <div class="accordion-body">
                    <ul>${integrantesHTML}</ul>
                    </div>
                </div>
                </div>`;
        }

        document.addEventListener("click", async function (e) {
            if (e.target.classList.contains("icono-editar")) {
                const grupoId = e.target.dataset.grupoId;

                const { data: inscripciones, error: e1 } = await supabase
                    .from('inscripciones')
                    .select('integranteID')
                    .eq('grupoID', grupoId);

                if (e1) {
                    console.error("Error al obtener inscripciones:", e1);
                    return;
                }

                const ids = inscripciones.map(i => i.integranteID);
                let inscriptos = [];
                if (ids.length > 0) {
                    const { data: integrantesData, error: e2 } = await supabase
                        .from('integrantes')
                        .select('ci, nombre')
                        .in('ci', ids);

                    if (e2) {
                        console.error("Error al obtener datos de integrantes:", e2);
                        return;
                    }
                    inscriptos = integrantesData;
                }

                let integrantesHTML = "";
                let footerHTML = "";

                if (inscriptos.length > 0) {
                    // Lista de integrantes con checkboxes
                    integrantesHTML = `
                        <ul style="list-style: none; padding-left: 0;">
                            ${inscriptos.map(row => `
                                <li class="form-check">
                                    <input 
                                        class="form-check-input" 
                                        type="checkbox" 
                                        value="${row.ci}" 
                                        id="chk-${row.ci}">
                                    <label class="form-check-label" for="chk-${row.ci}">
                                        ${row.nombre}
                                    </label>
                                </li>
                            `).join("")}
                        </ul>
                    `;

                    footerHTML = `
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" id="modalConfirmarEdicionBtn" class="btn btn-primary" data-grupo-id="${grupoId}">
                            Eliminar inscripciones
                        </button>
                    `;
                } else {
                    integrantesHTML = "<p>Todavía no hay integrantes en este grupo</p>";
                    footerHTML = `<button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>`;
                }

                const modalBody = document.querySelector("#modalEdicionGrupo .modal-body");
                const modalFooter = document.querySelector("#modalEdicionGrupo .modal-footer");
                modalBody.innerHTML = integrantesHTML;
                modalFooter.innerHTML = footerHTML;

                // Mostrar modal
                const modalEl = document.getElementById("modalEdicionGrupo");
                const modal = new bootstrap.Modal(modalEl);
                modal.show();


                const btnGuardar = document.getElementById("modalConfirmarEdicionBtn");
                if (btnGuardar) {
                    btnGuardar.addEventListener("click", async function () {
                        const grupoId = this.dataset.grupoId;

                        // Obtener checkboxes seleccionados
                        const seleccionados = Array.from(modalBody.querySelectorAll(".form-check-input:checked"))
                            .map(chk => chk.value);

                        if (seleccionados.length > 0) {
                            // Eliminar inscripciones
                            const { error: deleteError } = await supabase
                                .from("inscripciones")
                                .delete()
                                .in("integranteID", seleccionados)
                                .eq("grupoID", grupoId);

                            if (deleteError) {
                                console.error("Error eliminando integrantes:", deleteError);
                            } else {
                                console.log("Integrantes eliminados correctamente");
                            }
                        }
                        let tipoUsuarioParaEliminar;
                                        
                        for (let i = 0; i < seleccionados.length; i++) {
                            tipoUsuarioParaEliminar = await obtenerTipoUsuario(seleccionados[i]);
                            // Actualizar cupo del grupo según usuarioTipo
                            await modificarCupoGrupoPorUsuarioTipo(grupoId, tipoUsuarioParaEliminar);
                        }

                        // Cerrar modal
                        modal.hide();

                        // Actualizar lista de integrantes en UI
                        await actualizarIntegrantesGrupo(grupoId);
                    }, { once: true }); // evita duplicar listeners
                }
            }
        });

        contenedor.querySelectorAll('.reserve').forEach(boton => {
            boton.addEventListener('click', async function () {
                botonActivo = this;
                let grupoID = this.closest(".accordion-item").dataset.grupoId;

                if (this.classList.contains('btn-success')) {
                    // Cancelar inscripción
                    const inscripcionId = parseInt(this.getAttribute('data-inscripcion-id'));
                    if (!inscripcionId) {
                        modalMensaje.textContent = "No se pudo identificar la inscripción para cancelar.";
                        modal.show();
                        return;
                    }

                    mostrarModalConfirmacion("¿Está seguro de que desea cancelar su reserva?",async () => {
                        // Cancelar inscripción en base de datos
                        const { error } = await supabase
                        .from('inscripciones')
                        .delete()
                        .eq('id', inscripcionId);

                        if (error) {
                            console.error('Error al cancelar inscripción:', error);
                            modalMensaje.textContent = "Ocurrió un error al cancelar la inscripción.";
                            return;
                        }

                        await modificarCupoGrupoPorUsuarioTipo(grupoID, usuarioTipo);

                        botonActivo.textContent = 'Agendarme';
                        botonActivo.classList.remove('btn-success');
                        botonActivo.classList.add('btn-outline-primary');
                        botonActivo.removeAttribute('data-inscripcion-id');
                        const accordionItem = botonActivo.closest('.accordion-item');
                        const integrantesList = accordionItem.querySelector('.accordion-body ul');
                        const integrantes = integrantesList.querySelectorAll('li');

                        integrantes.forEach(li => {
                            if (li.textContent.trim() === nombreUsuario) {
                                li.remove();
                            }
                        });

                        if (integrantesList.children.length === 0) {
                            const mensaje = document.createElement('li');
                            mensaje.textContent = 'Todavía no hay integrantes en este grupo.';
                            integrantesList.appendChild(mensaje);
                        }

                        modal.hide();
                        await actualizarEstadoBotones();
                    });

                } else {

                    const cupoDelGrupo = await obtenerCupoGrupoPorUsuarioTipo(parseInt(grupoID));

                    if(cupoDelGrupo === 0){
                        mostrarModalSoloOk("No hay cupos disponibles para su voz en este grupo");
                    }else{

                        mostrarModalConfirmacion("¿Desea agendarse a este grupo?", async () => {   
                            const { data: nuevaInscripcion, error: errorInsert } = await supabase
                                .from('inscripciones')
                                .insert([{ grupoID: parseInt(grupoID), integranteID: usuarioActualCI }])
                                .select()
                                .single();

                            if (errorInsert) {
                            console.error('Error al insertar inscripción:', errorInsert);
                            modalMensaje.textContent = "Ocurrió un error al agendarse.";
                            return;
                            }

                            await modificarCupoGrupoPorUsuarioTipo(grupoID, usuarioTipo);

                            let totalCupoEnGrupo = await sumarCupos(grupoID);                            
                            if (totalCupoEnGrupo === 0) {
                                botonActivo.classList.add('btn-hidden');

                                const { data: grupo, error: errorGrupo } = await supabase
                                    .from('grupos')
                                    .select('descripcion, hora_inicio, hora_fin')
                                    .eq('id', parseInt(grupoID))
                                    .single();

                                    const inicio = new Date(grupo.hora_inicio);
                                    const fin = new Date(grupo.hora_fin);

                                    const formatoHora = { hour: '2-digit', minute: '2-digit', hour12: false };
                                    const horaInicio = inicio.toLocaleTimeString([], formatoHora);
                                    const horaFin = fin.toLocaleTimeString([], formatoHora);

                                    const fecha = new Date(grupo.hora_inicio);

                                    // Formato solo fecha (dd/mm/yyyy)
                                    const formatoFecha = { year: 'numeric', month: '2-digit', day: '2-digit' };
                                    const fechaGrupo = fecha.toLocaleDateString('es-ES', formatoFecha);


                                if (errorGrupo) {
                                    console.error('Error al obtener horario del grupo:', errorGrupo);
                                } else {
                                    let dirMails = await obtenerDirMailIntegrantes(grupoID);
                                    let horarioGrupo = horaInicio + " - " + horaFin;
                                    let grupoNombre = grupo.descripcion;

                                    try {
                                        // Ejecutar todos los envíos en paralelo y esperar a que terminen
                                        await Promise.all(
                                            dirMails.map(email => enviarCorreo(email, grupoNombre, fechaGrupo, horarioGrupo))
                                        );
                                        console.log('Todos los mails enviados');
                                    } catch (err) {
                                        console.error('Error enviando mails:', err);
                                    }
                                }
                  
                            }

                            // Actualizar UI
                            botonActivo.textContent = 'Cancelar';
                            botonActivo.classList.remove('btn-outline-primary');
                            botonActivo.classList.add('btn-success');                        
                            
                            botonActivo.setAttribute('data-inscripcion-id', nuevaInscripcion.id);

                            const accordionItem = botonActivo.closest('.accordion-item');
                            const integrantesList = accordionItem.querySelector('.accordion-body ul');

                            if (integrantesList.children.length === 1 && integrantesList.children[0].textContent.includes('Todavía no hay integrantes')) {
                            integrantesList.innerHTML = '';
                            }

                            const nuevoLi = document.createElement('li');
                            nuevoLi.textContent = nombreUsuario;
                            integrantesList.appendChild(nuevoLi);

                            modal.hide();
                            await actualizarEstadoBotones();
                        });
                        
                    }                

                }

            }); 
        }); 
        // 5️⃣ Una vez cargados todos los grupos, actualizar estado de los botones según cvpa
await actualizarEstadoBotones();

    }
});
