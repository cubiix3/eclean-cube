import { ipcMain } from 'electron'
import {
  getSchedules,
  addSchedule,
  removeSchedule,
  updateSchedule,
  runScheduleNow
} from '../services/schedulerService'

export function registerSchedulerIPC(): void {
  ipcMain.handle('scheduler:getAll', async () => {
    return getSchedules()
  })

  ipcMain.handle('scheduler:add', async (_event, schedule) => {
    return addSchedule(schedule)
  })

  ipcMain.handle('scheduler:remove', async (_event, id: string) => {
    removeSchedule(id)
  })

  ipcMain.handle('scheduler:update', async (_event, id: string, updates) => {
    return updateSchedule(id, updates)
  })

  ipcMain.handle('scheduler:runNow', async (_event, id: string) => {
    return await runScheduleNow(id)
  })
}
