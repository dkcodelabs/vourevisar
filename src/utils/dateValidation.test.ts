import { describe, it, expect } from 'vitest'
import {
    validateAndCorrectDate,
    validateISODate,
    isLeapYear,
    getDaysInMonthSafe,
    addDaysSafe,
} from './dateValidation'

describe('validateAndCorrectDate', () => {
    describe('datas válidas', () => {
        it('deve validar 15/01/2024 como válida', () => {
            const result = validateAndCorrectDate(2024, 1, 15)
            expect(result.isValid).toBe(true)
            expect(result.correctedDate).toBeDefined()
            expect(result.correctedDate?.getDate()).toBe(15)
            expect(result.correctedDate?.getMonth()).toBe(0) // Janeiro = 0
        })

        it('deve validar 28/02/2024 (ano bissexto) como válida', () => {
            const result = validateAndCorrectDate(2024, 2, 28)
            expect(result.isValid).toBe(true)
        })

        it('deve validar 29/02/2024 (ano bissexto) como válida', () => {
            const result = validateAndCorrectDate(2024, 2, 29)
            expect(result.isValid).toBe(true)
        })

        it('deve validar 31/12/2024 como válida', () => {
            const result = validateAndCorrectDate(2024, 12, 31)
            expect(result.isValid).toBe(true)
        })
    })

    describe('datas inválidas - mês fora do intervalo', () => {
        it('deve rejeitar mês 0', () => {
            const result = validateAndCorrectDate(2024, 0, 15)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Mês deve estar entre 1 e 12')
        })

        it('deve rejeitar mês 13', () => {
            const result = validateAndCorrectDate(2024, 13, 15)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Mês deve estar entre 1 e 12')
        })

        it('deve rejeitar mês negativo', () => {
            const result = validateAndCorrectDate(2024, -1, 15)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Mês deve estar entre 1 e 12')
        })
    })

    describe('datas inválidas - dia inválido', () => {
        it('deve rejeitar dia 0', () => {
            const result = validateAndCorrectDate(2024, 1, 0)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Dia deve ser maior que 0')
        })

        it('deve rejeitar dia negativo', () => {
            const result = validateAndCorrectDate(2024, 1, -1)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Dia deve ser maior que 0')
        })
    })

    describe('correção automática de datas', () => {
        it('deve corrigir 31/02 para 03/03 (em ano não bissexto)', () => {
            const result = validateAndCorrectDate(2023, 2, 31) // Fevereiro de 2023 tem 28 dias
            expect(result.isValid).toBe(false)
            expect(result.correctedDate).toBeDefined()
            expect(result.correctedDate?.getMonth()).toBe(2) // Março = 2
            expect(result.correctedDate?.getDate()).toBe(3) // 31 - 28 = 3
        })

        it('deve corrigir 30/02/2024 para 01/03/2024 (ano bissexto)', () => {
            const result = validateAndCorrectDate(2024, 2, 30) // Fevereiro de 2024 tem 29 dias
            expect(result.isValid).toBe(false)
            expect(result.correctedDate).toBeDefined()
            expect(result.correctedDate?.getMonth()).toBe(2) // Março = 2
            expect(result.correctedDate?.getDate()).toBe(1) // 30 - 29 = 1
        })

        it('deve corrigir 32/01 para 01/02', () => {
            const result = validateAndCorrectDate(2024, 1, 32) // Janeiro tem 31 dias
            expect(result.isValid).toBe(false)
            expect(result.correctedDate).toBeDefined()
            expect(result.correctedDate?.getMonth()).toBe(1) // Fevereiro = 1
            expect(result.correctedDate?.getDate()).toBe(1) // 32 - 31 = 1
        })

        it('deve corrigir 31/04 para 01/05', () => {
            const result = validateAndCorrectDate(2024, 4, 31) // Abril tem 30 dias
            expect(result.isValid).toBe(false)
            expect(result.correctedDate).toBeDefined()
            expect(result.correctedDate?.getMonth()).toBe(4) // Maio = 4
            expect(result.correctedDate?.getDate()).toBe(1)
        })
    })

    describe('parâmetros não inteiros', () => {
        it('deve rejeitar ano não inteiro', () => {
            const result = validateAndCorrectDate(2024.5, 1, 15)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Ano, mês e dia devem ser números inteiros')
        })

        it('deve rejeitar mês não inteiro', () => {
            const result = validateAndCorrectDate(2024, 1.5, 15)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Ano, mês e dia devem ser números inteiros')
        })

        it('deve rejeitar dia não inteiro', () => {
            const result = validateAndCorrectDate(2024, 1, 15.5)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Ano, mês e dia devem ser números inteiros')
        })
    })
})

describe('validateISODate', () => {
    describe('strings ISO válidas', () => {
        it('deve validar formato ISO completo', () => {
            const result = validateISODate('2024-06-15T10:30:00.000Z')
            expect(result.isValid).toBe(true)
            expect(result.correctedDate).toBeDefined()
        })

        it('deve validar formato ISO com data apenas', () => {
            const result = validateISODate('2024-06-15')
            expect(result.isValid).toBe(true)
        })

        it('deve validar formato ISO com timezone', () => {
            const result = validateISODate('2024-06-15T10:30:00+03:00')
            expect(result.isValid).toBe(true)
        })
    })

    describe('strings ISO inválidas', () => {
        it('deve rejeitar string vazia', () => {
            const result = validateISODate('')
            expect(result.isValid).toBe(false)
        })

        it('deve rejeitar texto aleatório', () => {
            const result = validateISODate('não é uma data')
            expect(result.isValid).toBe(false)
        })

        it('deve rejeitar formato DD/MM/YYYY', () => {
            const result = validateISODate('15/06/2024')
            expect(result.isValid).toBe(false)
        })
    })
})

describe('isLeapYear', () => {
    it('2024 deve ser ano bissexto', () => {
        expect(isLeapYear(2024)).toBe(true)
    })

    it('2023 não deve ser ano bissexto', () => {
        expect(isLeapYear(2023)).toBe(false)
    })

    it('2000 deve ser ano bissexto (divisível por 400)', () => {
        expect(isLeapYear(2000)).toBe(true)
    })

    it('1900 não deve ser ano bissexto (divisível por 100, mas não por 400)', () => {
        expect(isLeapYear(1900)).toBe(false)
    })
})

describe('getDaysInMonthSafe', () => {
    it('Janeiro deve ter 31 dias', () => {
        expect(getDaysInMonthSafe(2024, 1)).toBe(31)
    })

    it('Fevereiro de 2024 (bissexto) deve ter 29 dias', () => {
        expect(getDaysInMonthSafe(2024, 2)).toBe(29)
    })

    it('Fevereiro de 2023 (não bissexto) deve ter 28 dias', () => {
        expect(getDaysInMonthSafe(2023, 2)).toBe(28)
    })

    it('Abril deve ter 30 dias', () => {
        expect(getDaysInMonthSafe(2024, 4)).toBe(30)
    })
})

describe('addDaysSafe', () => {
    it('deve adicionar 1 dia corretamente', () => {
        const date = new Date(2024, 0, 15) // 15 de Janeiro
        const result = addDaysSafe(date, 1)
        expect(result.getDate()).toBe(16)
    })

    it('deve passar para o próximo mês ao adicionar dias', () => {
        const date = new Date(2024, 0, 31) // 31 de Janeiro
        const result = addDaysSafe(date, 1)
        expect(result.getMonth()).toBe(1) // Fevereiro
        expect(result.getDate()).toBe(1)
    })

    it('deve passar para o próximo ano ao adicionar dias', () => {
        const date = new Date(2024, 11, 31) // 31 de Dezembro
        const result = addDaysSafe(date, 1)
        expect(result.getFullYear()).toBe(2025)
        expect(result.getMonth()).toBe(0) // Janeiro
        expect(result.getDate()).toBe(1)
    })

    it('deve lidar corretamente com 30 dias adicionados', () => {
        const date = new Date(2024, 0, 15) // 15 de Janeiro
        const result = addDaysSafe(date, 30)
        expect(result.getMonth()).toBe(1) // Fevereiro
        expect(result.getDate()).toBe(14)
    })
})
