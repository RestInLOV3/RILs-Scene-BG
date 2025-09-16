// --- SceneConfig UI 확장 --- //
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
        $bgGroup.find('input[name="flags.rils-scene-bg.backgroundScale"]').val()
      ) || 3
    );
    await scene.setFlag(
      "rils-scene-bg",
      "backgroundBlur",
      parseFloat(
        $bgGroup.find('input[name="flags.rils-scene-bg.backgroundBlur"]').val()
      ) || 8
    );
  };

  $form.closest("form").on("submit", async () => {
    if (app.setFlagOnSubmit) await app.setFlagOnSubmit();
  });
});

// --- 전체 배경 추가 및 조정 --- //
let bgTweenTarget = { x: 0, y: 0 };
let bgSprite = null;
let bgTickerActive = false;

// canvas가 준비되면 한 번 호출
Hooks.on("canvasReady", (canvas) => {
  // 씬 로딩이 끝났는지 한 번 더 체크
  waitForSceneFlags(canvas.scene).then(() => {
    console.log("씬 로딩 끝남");
    addOrUpdateBackground(canvas);
  });
});

/** 씬의 플래그가 로드될 때까지 대기 */
function waitForSceneFlags(scene, retries = 10) {
  return new Promise((resolve) => {
    const check = () => {
      if (scene.getFlag("rils-scene-bg", "backgroundImage") !== undefined) {
        resolve();
      } else if (retries > 0) {
        setTimeout(() => check(--retries), 100); // 100ms 지연 후 다시 확인
      } else {
        resolve(); // 더 이상 기다리지 않고 그냥 실행
      }
    };
    check();
  });
}

// 창 크기 변경 시 재계산
Hooks.on("canvasResized", (canvas) => {
  addOrUpdateBackground(canvas);
});

function addOrUpdateBackground(canvas) {
  console.log("Adding or updating background 함수 호출됨");
  const scene = canvas.scene;
  if (!scene) {
    console.log("No scene found");
    return;
  }

  const bgImage = scene.getFlag("rils-scene-bg", "backgroundImage");
  if (!bgImage) return;

  const scaleMultiplier =
    scene.getFlag("rils-scene-bg", "backgroundScale") || 3;
  const blurAmount = scene.getFlag("rils-scene-bg", "backgroundBlur") || 8;

  // 기존 배경 제거
  const oldBg = canvas.stage.getChildByName("rilsSceneBg");
  if (oldBg) {
    canvas.stage.removeChild(oldBg);
    console.log("Old background removed");
  }

  const bgContainer = new PIXI.Container();
  bgContainer.name = "rilsSceneBg";
  bgContainer.zIndex = -1000;
  bgContainer.interactive = false;

  bgSprite = PIXI.Sprite.from(bgImage);

  const setupSprite = () => {
    const imgRatio = bgSprite.texture.width / bgSprite.texture.height;
    const screenRatio = canvas.app.screen.width / canvas.app.screen.height;

    let scaleFactor;
    if (screenRatio > imgRatio) {
      scaleFactor = canvas.app.screen.width / bgSprite.texture.width;
    } else {
      scaleFactor = canvas.app.screen.height / bgSprite.texture.height;
    }

    scaleFactor *= scaleMultiplier;
    bgSprite.scale.set(scaleFactor);

    bgSprite.anchor.set(0.5);
    bgSprite.x = canvas.scene.width / 2;
    bgSprite.y = canvas.scene.height / 2;
    bgTweenTarget.x = 0;
    bgTweenTarget.y = 0;

    const blurFilter = new PIXI.filters.BlurFilter();
    blurFilter.blur = blurAmount;
    bgSprite.filters = [blurFilter];

    bgContainer.addChild(bgSprite);
    canvas.stage.addChildAt(bgContainer, 0);

    bgTickerActive = true; // 여기서부터 ticker 활성화
  };

  // 🔑 텍스처가 이미 로드된 상태라면 바로 실행
  if (bgSprite.texture.baseTexture.valid) {
    setupSprite();
  } else {
    bgSprite.texture.baseTexture.once("loaded", setupSprite);
  }
}

// --- 한 번만 등록하는 Ticker --- //
let warnedOnce = false;
PIXI.Ticker.shared.add(() => {
  if (!bgSprite || !bgTickerActive) {
    if (!warnedOnce) {
      console.log("배경 스프라이트가 아직 준비되지 않았음 (한 번만 출력)");
      warnedOnce = true;
    }
    return;
  }
  warnedOnce = false;

  const dx = (canvas.stage.pivot.x * -1 - bgTweenTarget.x) * 0.05;
  const dy = (canvas.stage.pivot.y * -1 - bgTweenTarget.y) * 0.05;

  if (Math.abs(dx) > 0.1) bgTweenTarget.x += dx;
  if (Math.abs(dy) > 0.1) bgTweenTarget.y += dy;

  bgSprite.x = canvas.scene.width / 2 + bgTweenTarget.x * 0.2;
  bgSprite.y = canvas.scene.height / 2 + bgTweenTarget.y * 0.2;
});
