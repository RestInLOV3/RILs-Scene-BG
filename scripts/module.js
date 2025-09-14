Hooks.once("init", () => {
  // Scene에 backgroundImage 필드 추가
  foundry.data.SceneData.defineSchema({
    backgroundImage: new foundry.data.fields.FilePathField({
      categories: ["IMAGE"],
      required: false,
      nullable: true,
    }),
  });
});

Hooks.on("renderSceneConfig", (app, html) => {
  const bgField = `
    <div class="form-group">
      <label>Background Image</label>
      <div class="form-fields">
        <file-picker type="image" name="backgroundImage"
          value="${app.object.backgroundImage || ""}">
        </file-picker>
      </div>
      <p class="notes">Overrides background color when set.</p>
    </div>`;

  html
    .find("input[name='backgroundColor']")
    .closest(".form-group")
    .after(bgField);
});

Hooks.on("canvasReady", (canvas) => {
  const scene = canvas.scene;
  if (!scene.backgroundImage) return;

  const tex = PIXI.Texture.from(scene.backgroundImage);
  const sprite = new PIXI.Sprite(tex);

  sprite.width = canvas.dimensions.sceneWidth;
  sprite.height = canvas.dimensions.sceneHeight;

  sprite.zIndex = -100; // 타일보다 뒤
  sprite.alpha = 1; // 투명도 조정 가능
  sprite.interactive = false; // 클릭 방해하지 않도록
  sprite.buttonMode = false;

  canvas.stage.addChildAt(sprite, 0);
});
