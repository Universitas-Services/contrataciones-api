export class BusinessDaysUtil {
  /**
   * Feriados fijos a nivel nacional en Venezuela (MM-DD)
   * Se pueden extender los feriados móviles (Carnaval, Semana Santa) en el futuro.
   */
  static getHolidays(): string[] {
    return [
      '01-01', // Año Nuevo
      '04-19', // Declaración de la Independencia
      '05-01', // Día del Trabajador
      '06-24', // Batalla de Carabobo
      '07-05', // Día de la Independencia
      '07-24', // Natalicio de Simón Bolívar
      '10-12', // Día de la Resistencia Indígena
      '12-24', // Nochebuena
      '12-25', // Navidad
      '12-31', // Fin de año
    ];
  }

  static isHoliday(date: Date): boolean {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return this.getHolidays().includes(`${month}-${day}`);
  }

  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  }

  static isBusinessDay(date: Date): boolean {
    return !this.isWeekend(date) && !this.isHoliday(date);
  }

  static addBusinessDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result)) {
        added++;
      }
    }
    return result;
  }

  static subtractBusinessDays(startDate: Date, days: number): Date {
    const result = new Date(startDate);
    let subtracted = 0;
    while (subtracted < days) {
      result.setDate(result.getDate() - 1);
      if (this.isBusinessDay(result)) {
        subtracted++;
      }
    }
    return result;
  }

  /**
   * Diferencia en días hábiles entre dos fechas (start < end)
   */
  static getBusinessDaysDifference(startDate: Date, endDate: Date): number {
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Normalizar horas
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let days = 0;
    while (current < end) {
      current.setDate(current.getDate() + 1);
      if (this.isBusinessDay(current)) {
        days++;
      }
    }
    return days;
  }
}
