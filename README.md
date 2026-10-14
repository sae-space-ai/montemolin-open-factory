# MONTEMOLÍN OPEN FACTORY

Factoría europea de software abierto y auditable. **Primer encargo:** construir su propio gestor de proyectos y evidencias.

## Estado

- La interfaz experimental v0.1 está publicada de forma independiente en https://montemolin-open-factory.gagprompt.chatgpt.site/
- Esta rama contiene el núcleo **v0.2**, en revisión. **No está conectado al despliegue v0.1.**
- Node.js 22, JavaScript de módulos ES, sin paquetes externos de ejecución, licencia MIT.
- **No contiene integración real de IA, firma digital, autenticación de usuarios, ni almacenamiento multiusuario.**

## Inicio local (sin Python)

```bash
git clone https://github.com/sae-space-ai/montemolin-open-factory.git
cd montemolin-open-factory
git switch fase-1-nucleo-auditable
npm test
npm start
```

Abrir http://127.0.0.1:5679. Los datos se guardan de forma persistente en `data/factory.json`. Esa carpeta se excluye del control de versiones. No subir datos reales confidenciales al repositorio.

## Docker (red de loopback)

Configure `FACTORY_TOKEN` en el entorno antes de ejecutar:

```bash
docker compose up --build -d
```

Abrir http://127.0.0.1:5679 e introducir ese mismo token en la cabecera de la aplicación. El servidor Docker escucha en el contenedor, pero el puerto publicado queda ligado a 127.0.0.1 del ordenador, **no expuesto públicamente**.

## Proceso de aceptación

Registrar proyecto -> requisito -> tarea -> artefacto con origen -> terminar tarea -> ejecutar verificación -> aprobación humana -> entrega.

Controles deterministas: V01 proyecto identificado, V02 requisitos existentes, V03 tarea por requisito, V04 todas las tareas finalizadas, V05 artefacto por tarea, V06 SHA-256 consistente, V07 procedencia declarada.

Una verificación PASS de los siete controles es requisito necesario, pero **no suficiente** para afirmar que el código cargado funciona: los controles examinan la estructura y la integridad del registro. No ejecutan el código aportado ni autentican su procedencia.

La aprobación se asocia al SHA-256 de la versión exacta. Cambiar requisitos, tareas o artefactos altera el digest y bloquea la entrega hasta repetir la verificación y la aprobación. Importar datos descarta aprobaciones previas por diseño.

```bash
npm test
```

Las siete pruebas de aceptación utilizan `node:test`, se ejecutan sin un LLM y se repiten en GitHub Actions sobre el código del commit.

## Límites y próximos módulos

Consultar [Estado y límites](docs/ESTADO_Y_LIMITES.md). Siguientes hitos: almacenamiento transaccional multiusuario, identidad verificable y roles, repositorio Git conectado, aislamiento de ejecución del código, pruebas funcionales en sandbox, adaptadores a proveedores Qwen/Nebius/JOULE y telemetría de coste/energía.

La presencia de principios de diseño europeos no equivale a certificación de cumplimiento legal.
