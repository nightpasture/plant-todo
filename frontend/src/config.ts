
/**
 * 全局应用配置文件
 */
export const APP_CONFIG = {
  // 后端 API 的基础地址。
  // 如果前端和后端部署在同一域名/端口下，可以保持为空字符串 ''。
  // 如果是跨域部署，请填写如 'http://localhost:3000' 或服务器 IP。
  API_BASE_URL: '', 
  
  // 同步接口的路径
  SYNC_PATH: '/api/sync/default',

  // 历史记录接口路径
  HISTORY_PATH: '/api/sync/recodes/default',

  // 图片上传与获取路径
  IMAGE_PATH: '/api/sync/image/default',

  // 恢复出厂设置路径
  RESET_PATH: '/api/sync/factory-reset',
  
  // 云端同步的轮询间隔（毫秒）
  SYNC_INTERVAL: 15000,
  
  // 本地数据自动保存并尝试同步的延迟（毫秒）
  AUTO_SAVE_DELAY: 2000
};
