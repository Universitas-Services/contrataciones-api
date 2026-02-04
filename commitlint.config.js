module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',     // Nueva funcionalidad
                'fix',      // Bug fix
                'docs',     // Cambios en documentación
                'style',    // Formato (sin cambios de código)
                'refactor', // Refactorización
                'test',     // Agregar tests
                'chore',    // Tareas de mantenimiento
                'perf',     // Mejoras de performance
                'ci',       // Cambios en CI/CD
                'build',    // Cambios en build system
                'revert',   // Revertir commits previos
            ],
        ],
        'subject-case': [0], // Permite cualquier case en el subject
        'subject-empty': [2, 'never'], // Subject no puede estar vacío
        'subject-full-stop': [2, 'never', '.'], // Subject no debe terminar en punto
        'type-empty': [2, 'never'], // Type no puede estar vacío
        'scope-case': [0], // Permite cualquier case en scope
    },
};
