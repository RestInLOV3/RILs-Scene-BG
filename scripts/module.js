// --- SceneConfig 및 Canvas 배경 이미지 모듈 (v13 호환) ---
Hooks.on("renderSceneConfig", async (app, html) => {
  if (!app.isEditable) return;
  const scene = app.document;

  const currentImage = scene.getFlag("rils-scene-bg", "backgroundImage") || "";
  const currentScale = scene.getFlag("rils-scene-bg", "backgroundScale") || 3;
  const currentBlur = scene.getFlag("rils-scene-bg", "backgroundBlur") || 8;

  const $form = $(html);

  if ($form.find(".rils-scene-bg-group").length === 0) {
    const $injection = $(`
      <div class="form-group rils-scene-bg-group">
        <label>배경 이미지</label>
        <div class="form-fields">
          <input type="text" name="flags.rils-scene-bg.backgroundImage" value="${currentImage}" placeholder="배경 이미지 경로를 입력하세요">
          <button type="button" class="file-picker">파일 선택</button>
        </div>
        <label>배율</label>
        <input type="number" step="0.1" name="flags.rils-scene-bg.backgroundScale" value="${currentScale}">
        <label>블러 강도</label>
        <input type="number" step="1" name="flags.rils-scene-bg.backgroundBlur" value="${currentBlur}">
        <p class="notes">배경 색상을 덮어씁니다.</p>
      </div>
    `);

    const $target = $form
      .find('color-picker[name="backgroundColor"]')
      .closest(".form-group");
    if ($target.length) {
      $target.after($injection);
    } else {
      $form.append($injection);
    }
  }

  const $bgGroup = $form.find(".rils-scene-bg-group");

  $bgGroup.find(".file-picker").on("click", () => {
    const picker = new FilePicker({
      type: "image",
      current: $bgGroup
        .find('input[name="flags.rils-scene-bg.backgroundImage"]')
        .val(),
      callback: (path) => {
        $bgGroup
          .find('input[name="flags.rils-scene-bg.backgroundImage"]')
          .val(path);
      },
    });
    picker.render(true);
  });

  app.setFlagOnSubmit = async () => {
    if (scene.setFlag) {
      await scene.setFlag(
        "rils-scene-bg",
        "backgroundImage",
        $bgGroup
          .find('input[name="flags.rils-scene-bg.backgroundImage"]')
          .val() || null
      );
      await scene.setFlag(
        "rils-scene-bg",
        "backgroundScale",
        parseFloat(
          $bgGroup
            .find('input[name="flags.rils-scene-bg.backgroundScale"]')
            .val()
        ) || 3
      );
      await scene.setFlag(
        "rils-scene-bg",
        "backgroundBlur",
        parseFloat(
          $bgGroup
            .find('input[name="flags.rils-scene-bg.backgroundBlur"]')
            .val()
        ) || 8
      );
    }
  };

  $form.closest("form").on("submit", async () => {
    if (app.setFlagOnSubmit) await app.setFlagOnSubmit();
  });
});

// --- 전체 배경 추가 및 조정 ---
Hooks.on("canvasReady", (canvas) => addOrUpdateBackground(canvas));
Hooks.on("canvasResized", (canvas) => addOrUpdateBackground(canvas));
Hooks.on("renderScene", (scene, html, data) => {
  addOrUpdateBackground(canvas);
});

function addOrUpdateBackground(canvas) {
  const scene = canvas.scene;
  const bgImage = scene.getFlag("rils-scene-bg", "backgroundImage");
  if (!bgImage) return;

  const scaleMultiplier =
    scene.getFlag("rils-scene-bg", "backgroundScale") || 3;
  const blurAmount = scene.getFlag("rils-scene-bg", "backgroundBlur") || 8;

  // 이전 배경 제거
  const oldBg = canvas.stage.getChildByName("rilsSceneBg");
  if (oldBg) canvas.stage.removeChild(oldBg);

  const bgContainer = new PIXI.Container();
  bgContainer.name = "rilsSceneBg";
  bgContainer.zIndex = -1000;
  bgContainer.interactive = false;

  const sprite = PIXI.Sprite.from(bgImage);

  // 화면과 이미지 비율 계산
  const imgRatio = sprite.texture.width / sprite.texture.height;
  const screenRatio = canvas.app.screen.width / canvas.app.screen.height;

  let scaleFactor;
  if (screenRatio > imgRatio) {
    scaleFactor = canvas.app.screen.width / sprite.texture.width;
  } else {
    scaleFactor = canvas.app.screen.height / sprite.texture.height;
  }

  // 플래그에서 가져온 배율 적용
  scaleFactor *= scaleMultiplier;
  sprite.scale.set(scaleFactor);

  // 씬 좌표 기준 중앙 배치
  sprite.anchor.set(0.5);
  sprite.x = canvas.scene.width / 2;
  sprite.y = canvas.scene.height / 2;
  sprite.alpha = 1;

  // 블러 필터 적용
  const blurFilter = new PIXI.filters.BlurFilter();
  blurFilter.blur = blurAmount;
  sprite.filters = [blurFilter];

  bgContainer.addChild(sprite);

  // canvas.stage가 아닌 canvas.stage 안에 추가
  canvas.stage.addChildAt(bgContainer, 0);

  console.log("씬 기준 배경 추가 완료:", bgContainer);
  console.log("Sprite scaled width x height:", sprite.width, sprite.height);
  console.log("배율:", scaleMultiplier, "블러:", blurAmount);
}
