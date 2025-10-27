export default async function globalTeardown() {
    console.log('🧹 Limpiando contenedor PostgreSQL...');

    const postgresContainer = (global as any).__POSTGRES_CONTAINER__;

    if (postgresContainer) {
        await postgresContainer.stop();
        console.log('✅ Contenedor PostgreSQL detenido');
    }
}