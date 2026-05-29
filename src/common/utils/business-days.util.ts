export class BusinessDaysUtil {
  /**
   * Verifica si es fin de semana (sábado o domingo).
   * ÚNICO dato fijo en el código.
   */
  static isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  }

  /**
   * Verifica si es un día festivo del ente.
   * Los festivos se reciben como parámetro (vienen de la BD).
   * Acepta formatos: "MM-DD" (recurrente) y "YYYY-MM-DD" (específico).
   */
  static isHoliday(date: Date, diasNoLaborablesEnte: string[]): boolean {
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const mmdd = `${month}-${day}`;

    const yyyymmdd = date.toISOString().split('T')[0];

    return diasNoLaborablesEnte.includes(mmdd) || diasNoLaborablesEnte.includes(yyyymmdd);
  }

  /**
   * Verifica si es día hábil (no es fin de semana ni festivo del ente).
   */
  static isBusinessDay(date: Date, diasEnte: string[]): boolean {
    return !this.isWeekend(date) && !this.isHoliday(date, diasEnte);
  }

  static addBusinessDays(startDate: Date, days: number, diasEnte: string[]): Date {
    const result = new Date(startDate);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      if (this.isBusinessDay(result, diasEnte)) {
        added++;
      }
    }
    return result;
  }

  static subtractBusinessDays(startDate: Date, days: number, diasEnte: string[]): Date {
    const result = new Date(startDate);
    let subtracted = 0;
    while (subtracted < days) {
      result.setDate(result.getDate() - 1);
      if (this.isBusinessDay(result, diasEnte)) {
        subtracted++;
      }
    }
    return result;
  }

  /**
   * Diferencia en días hábiles entre dos fechas (start < end)
   */
  static getBusinessDaysDifference(startDate: Date, endDate: Date, diasEnte: string[]): number {
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Normalizar horas
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let days = 0;
    while (current < end) {
      current.setDate(current.getDate() + 1);
      if (this.isBusinessDay(current, diasEnte)) {
        days++;
      }
    }
    return days;
  }
}
