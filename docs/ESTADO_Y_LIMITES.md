# MONTEMOLÍN OPEN FACTORY — delimitación de alcance

Estado: **v0.2, núcleo propuesto para revisión en rama**.

## Implantado en el repositorio
- API HTTP de gestión de proyectos, requisitos, tareas y artefactos.
- Persistencia JSON local con escritura temporal y sustitución atómica; **solo un proceso escritor**.
- Integridad SHA-256 de contenido; origen de artefactos autodeclarado, no autenticado.
- Siete comprobaciones deterministas en módulo separado de la IA.
- Aprobación humana asociada al digest de la versión; entrega bloqueada ante FAIL o cambio.
- Exportación JSON e importación sin heredar certificados de confianza de otro entorno.
- Interfaz web sin dependencias externas y ejecución local o mediante Docker.
- Pruebas automáticas en GitHub Actions; ejecutar para comprobar resultados.

## No implantado
- Conexión real con Qwen, Nebius, JOULE u otros proveedores de modelos.
- Integración con repositorios Git para ingestión de commits o firmas.
- Ejecución aislada de código no confiable; el sistema **no** ejecuta código subido.
- Base de datos multiusuario/transaccional o sincronización en equipo.
- Autenticación por cuentas, roles, SSO, verificación real de identidad del revisor.
- Firma digital de evidencias ni sellado de tiempo externo.
- Medición de coste energético o emisiones; solo timestamps y eventos operativos.
- Despliegue vinculado con la interfaz v0.1 de gagprompt.chatgpt.site.
- Certificación de conformidad EU AI Act, RGPD u otras normas.

## Límites de confianza
Los controles verifican integridad y consistencia de los registros declarados.
Que un artefacto tenga SHA-256 no demuestra que su contenido sea correcto o se haya ejecutado.
El origen indicado por un operador aún no puede autentificarse. El resultado PASS
es **aceptación estructural**, no auditoría de seguridad ni prueba funcional del software adjunto.
El almacenamiento es apto para prototipo individual, no para entornos productivos compartidos.
No publicar el servicio en Internet sin endurecimiento de seguridad y arquitectura multiusuario.
