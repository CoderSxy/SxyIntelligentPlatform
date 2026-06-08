from app.core.model_catalog import DEFAULT_MODEL_PROVIDERS
from app.services.repository import InMemoryRepository


def test_provider_catalog_covers_llm_image_and_video_models():
    model_types = {
        model_type
        for provider in DEFAULT_MODEL_PROVIDERS
        for model_type in provider["model_types"]
    }
    provider_ids = {provider["id"] for provider in DEFAULT_MODEL_PROVIDERS}

    assert {"llm", "image", "video"}.issubset(model_types)
    assert "deepseek" in provider_ids
    assert "jimeng" in provider_ids
    assert "kling" in provider_ids


def test_create_model_config_for_llm_image_and_video():
    repo = InMemoryRepository()
    admin = repo.get_user_by_username("admin")
    assert admin is not None
    key = repo.create_access_key(
        provider="deepseek",
        label="DeepSeek 平台 Key",
        secret="sk-deepseek-demo",
        scope="platform",
        owner_id=admin.id,
        base_url="https://api.deepseek.com",
    )

    llm = repo.create_model_config(
        provider="deepseek",
        model_type="llm",
        model_name="deepseek-chat",
        display_name="DeepSeek Chat",
        capability="novel_writing",
        access_key_id=key.id,
        default_params={"temperature": 0.8},
    )
    image = repo.create_model_config(
        provider="jimeng",
        model_type="image",
        model_name="jimeng-image-v3",
        display_name="即梦图片生成",
        capability="image_generation",
        access_key_id=key.id,
        default_params={"size": "1024x1024"},
    )
    video = repo.create_model_config(
        provider="kling",
        model_type="video",
        model_name="kling-v1-6",
        display_name="可灵视频生成",
        capability="video_generation",
        access_key_id=key.id,
        default_params={"duration": 5},
    )

    configs = repo.list_model_configs()
    assert {config.id for config in configs} == {llm.id, image.id, video.id}
    assert llm.model_type == "llm"
    assert image.capability == "image_generation"
    assert video.provider == "kling"


def test_scenario_bindings_store_workflow_default_models():
    repo = InMemoryRepository()
    admin = repo.get_user_by_username("admin")
    assert admin is not None
    key = repo.create_access_key(
        provider="openai",
        label="OpenAI 平台 Key",
        secret="sk-openai-demo",
        scope="platform",
        owner_id=admin.id,
        base_url="https://api.openai.com/v1",
    )
    llm = repo.create_model_config(
        provider="openai",
        model_type="llm",
        model_name="gpt-4.1",
        display_name="GPT-4.1",
        capability="novel_writing",
        access_key_id=key.id,
        default_params={"temperature": 0.7},
    )
    image = repo.create_model_config(
        provider="openai",
        model_type="image",
        model_name="gpt-image-1",
        display_name="GPT Image",
        capability="image_generation",
        access_key_id=key.id,
        default_params={"quality": "high"},
    )

    binding = repo.upsert_scenario_binding(
        scenario="novel_creation",
        llm_model_id=llm.id,
        image_model_id=image.id,
        video_model_id=None,
    )

    assert binding.scenario == "novel_creation"
    assert binding.llm_model_id == llm.id
    assert binding.image_model_id == image.id
    assert binding.video_model_id is None
    assert repo.get_scenario_binding("novel_creation") == binding


def test_novel_to_video_binding_supports_all_three_model_types():
    repo = InMemoryRepository()
    admin = repo.get_user_by_username("admin")
    assert admin is not None
    key = repo.create_access_key(
        provider="siliconflow",
        label="SiliconFlow Key",
        secret="sk-siliconflow-demo",
        scope="platform",
        owner_id=admin.id,
        base_url="https://api.siliconflow.cn/v1",
    )

    llm = repo.create_model_config(
        provider="siliconflow",
        model_type="llm",
        model_name="Qwen/Qwen3-32B",
        display_name="Qwen3 32B",
        capability="storyboard",
        access_key_id=key.id,
        default_params={"temperature": 0.6},
    )
    image = repo.create_model_config(
        provider="wanxiang",
        model_type="image",
        model_name="wanx-v1",
        display_name="通义万相图片",
        capability="image_generation",
        access_key_id=key.id,
        default_params={"style": "cinematic"},
    )
    video = repo.create_model_config(
        provider="kling",
        model_type="video",
        model_name="kling-v1-6",
        display_name="可灵图生视频",
        capability="video_generation",
        access_key_id=key.id,
        default_params={"duration": 5},
    )

    binding = repo.upsert_scenario_binding(
        scenario="novel_to_video",
        llm_model_id=llm.id,
        image_model_id=image.id,
        video_model_id=video.id,
    )

    assert binding.llm_model_id == llm.id
    assert binding.image_model_id == image.id
    assert binding.video_model_id == video.id
