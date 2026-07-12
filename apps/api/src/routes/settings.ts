import type { FastifyInstance } from 'fastify';
import {
  getModelProviderSettings,
  saveModelProviderSettings,
  testModelProviderSettings,
  getModelProviderSettingsV2,
  listModelProviderProfiles,
  createModelProviderProfile,
  updateModelProviderProfile,
  deleteModelProviderProfile,
  activateModelProviderProfile,
  getDataAccountBook,
  saveMinimalMode,
  buildMinimalFeatureState,
  KnowledgeCoreError,
} from '@zhijing/core';
import type {
  SaveModelProviderSettingsRequest,
  TestModelProviderSettingsRequest,
  CreateModelProviderProfileRequest,
  UpdateModelProviderProfileRequest,
} from '@zhijing/shared';

/**
 * 注册设置路由（模型供应商配置、数据账户设置、最小模式）。
 * @param app - Fastify 实例
 * @author fxbin
 */
export function registerSettingsRoutes(app: FastifyInstance): void {
  app.get('/api/settings/model-provider', async () => getModelProviderSettings());

  app.put<{ Body: Partial<SaveModelProviderSettingsRequest> }>('/api/settings/model-provider', async (request, reply) => {
    const provider = typeof request.body?.provider === 'string' ? request.body.provider.trim() : '';
    const model = typeof request.body?.model === 'string' ? request.body.model.trim() : '';
    if (!provider || !model) {
      return reply.code(400).send({ error: 'Provider and model are required.' });
    }

    try {
      return saveModelProviderSettings({
        provider,
        model,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        clearApiKey: request.body?.clearApiKey === true,
        clearBaseUrl: request.body?.clearBaseUrl === true,
      });
    } catch (error) {
      request.log.error({ error }, 'model provider settings save failed');
      return reply.code(500).send({ error: 'Model provider settings save failed.' });
    }
  });

  app.post<{ Body: Partial<TestModelProviderSettingsRequest> }>('/api/settings/model-provider/test', async (request) => testModelProviderSettings({
    profileId: typeof request.body?.profileId === 'string' ? request.body.profileId.trim() : undefined,
    provider: typeof request.body?.provider === 'string' ? request.body.provider.trim() : undefined,
    model: typeof request.body?.model === 'string' ? request.body.model.trim() : undefined,
    apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
    baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl.trim() : undefined,
  }));

  app.get('/api/settings/model-provider/v2', async () => getModelProviderSettingsV2());

  app.get('/api/settings/model-provider/profiles', async () => ({
    profiles: listModelProviderProfiles(),
  }));

  app.post<{ Body: Partial<CreateModelProviderProfileRequest> }>('/api/settings/model-provider/profiles', async (request, reply) => {
    const name = typeof request.body?.name === 'string' ? request.body.name.trim() : '';
    const provider = typeof request.body?.provider === 'string' ? request.body.provider.trim() : '';
    const model = typeof request.body?.model === 'string' ? request.body.model.trim() : '';
    if (!name || !provider || !model) {
      return reply.code(400).send({ error: 'name、provider、model 均为必填。' });
    }
    try {
      const profile = createModelProviderProfile({
        name,
        provider,
        model,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        isDefault: request.body?.isDefault === true,
      });
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile create failed');
      return reply.code(500).send({ error: 'Model provider profile create failed.' });
    }
  });

  app.patch<{ Params: { id: string }; Body: Partial<UpdateModelProviderProfileRequest> }>('/api/settings/model-provider/profiles/:id', async (request, reply) => {
    try {
      const profile = updateModelProviderProfile(request.params.id, {
        name: typeof request.body?.name === 'string' ? request.body.name : undefined,
        provider: typeof request.body?.provider === 'string' ? request.body.provider : undefined,
        model: typeof request.body?.model === 'string' ? request.body.model : undefined,
        apiKey: typeof request.body?.apiKey === 'string' ? request.body.apiKey : undefined,
        baseUrl: typeof request.body?.baseUrl === 'string' ? request.body.baseUrl : undefined,
        enabled: typeof request.body?.enabled === 'boolean' ? request.body.enabled : undefined,
        fallbackToMock: typeof request.body?.fallbackToMock === 'boolean' ? request.body.fallbackToMock : undefined,
        isDefault: typeof request.body?.isDefault === 'boolean' ? request.body.isDefault : undefined,
        clearApiKey: request.body?.clearApiKey === true,
        clearBaseUrl: request.body?.clearBaseUrl === true,
      });
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile update failed');
      return reply.code(500).send({ error: 'Model provider profile update failed.' });
    }
  });

  app.delete<{ Params: { id: string } }>('/api/settings/model-provider/profiles/:id', async (request, reply) => {
    try {
      return deleteModelProviderProfile(request.params.id);
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile delete failed');
      return reply.code(500).send({ error: 'Model provider profile delete failed.' });
    }
  });

  app.post<{ Params: { id: string } }>('/api/settings/model-provider/profiles/:id/activate', async (request, reply) => {
    try {
      const profile = activateModelProviderProfile(request.params.id);
      return { profile };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'model provider profile activate failed');
      return reply.code(500).send({ error: 'Model provider profile activate failed.' });
    }
  });

  app.get('/api/settings/data-account', async () => {
    const book = getDataAccountBook();
    return { book, source: 'persisted' };
  });

  app.put<{ Body: { enabled?: boolean } }>('/api/settings/minimal-mode', async (request, reply) => {
    const body = request.body ?? {};
    if (typeof body.enabled !== 'boolean') {
      return reply.code(400).send({ error: 'enabled boolean is required' });
    }
    try {
      const book = saveMinimalMode(body.enabled);
      const featureState = buildMinimalFeatureState(body.enabled, Date.now());
      return { book, featureState };
    } catch (error) {
      if (error instanceof KnowledgeCoreError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      request.log.error({ error }, 'save minimal mode failed');
      return reply.code(500).send({ error: 'Save minimal mode failed.' });
    }
  });
}
