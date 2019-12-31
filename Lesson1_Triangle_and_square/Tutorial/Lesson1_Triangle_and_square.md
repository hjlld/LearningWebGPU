# Lesson1 三角和方块的故事

## 教程说明

欢迎来到 LearningWebGPU 教程，本教程改写自原本的 LearningWebGL.com 的 WebGL 入门教程，而后者则是改编于经典的 Nehe 的 OpenGL 教程。在开始教程前，有一些大家需要知道的事情：

1. 目前 WebGPU 仍然处于草稿阶段，所有的 API 接口可能会在未来发生变化。

2. 目前浏览器对于 WebGPU 的实现和支持仍处于实验阶段，可能会发生一些因为浏览器实现导致的 Bug 或错误；另外，开启浏览器的试验功能可能会降低浏览器的安全性，所以你不应该使用学习 WebGPU 开发的浏览器作为主力浏览器，例如请不要在这个浏览器中浏览、输入个人隐私信息、不要进行网页支付等。

3. 考虑到 WebGPU 正式投入生产环境应该是数年后的事情，所以本教程中将会使用大量新的 ECMA Script 的新特性，这些特性可能并不被当下的浏览器和 JavaScript 引擎所支持。

4. 本系列的教程是针对那些已经具备相应编程知识但没有实际 3D 图形经验的人的；目标是让学习者创建并运行代码，并且明白代码其中的含义，从而快速地创建自己的 3D Web 页面。

5. 我编写这套教程是因为我在独立学习 WebGPU，所以教程中可能（非常可能）会有错误，所以还请风险自担。尽管如此，我还是会不断的修正 Bug 和改正其中的错误的，所以如果你发现了教程中的错误或其他任何改进建议，请在本教程的 Github 仓库的 Issue 页面提交。

下面，让我们正式开始第 1 课的内容。

## 初始化 WebGPU

在上一节课中，我们成功获取了 WebGPU 的上下文。但是我们也提到过，在 WebGL 中上下文是 JavaScript 和 GPU 交互的重要桥梁，几乎所有的 WebGL 接口都是通过上下文来实现的；但是在 WebGPU 标准中，由于摒弃了固定渲染管线，并且从理念和设计哲学上高度借鉴 DirectX 12、Vulkan、Metal 这三大现代图形标准，所以 WebGPU 的上下文将不再承担如此繁重的工作，而仅仅成为和 HTML `<canvas>` 元素交互的桥梁。所以，在这节课中我们将会迎来一些新朋友，它们和上下文一起，组成了 WebGPU 绘制的基础环境。

打开 `app.ts` 文件，我们发现代码比上节课多了很多。如果你之前没有接触过 WebGL 原生 API，会认为如此多的的代码只为了画一个三角形和一个正方形，是不是有点过于[复杂](https://www.weibo.com/1657422865/zz19IFEfc?type=comment#_rnd1577769550951)；相反，如果你接触过 WebGL 或者学习过本课程的 WebGL 版本，那么你应该早已习以为常。事实上，相比 WebGL 的一次完整绘制流程，WebGPU 在概念和代码的复杂度上，都要降低很多了。

首先，我们可以看到，我们从依赖中引入了一个新的模块，叫做 `glslangModule`。

```typescript
import glslangModule from '@webgpu/glslang/dist/web-devel/glslang.onefile';
```

如果你还记得上一课中，我们曾经提起过，现时的 WebGPU 实际上发生了分裂，一派以 Apple 为代表的使用基于文本的 WSL 语言作为着色器语言，另一派以 Google 为代表的使用 GLSL 4.5 并编译成二进制的 SPIR-V 作为着色器语言。本套教程正是基于后者的，所以这个 `glslangModule` 就是用来把 GLSL 4.5 编译成 SPIR-V 的，编译过程中使用了 WebAssembly。

然后，相比上一课我们的 `App` 类只有一个公共成员 `canvas`，而这一课我们突然拥有了包括 `adapter`、`device`、`swapChain` 在内的许多其他成员。我会在下文中详细解释每个成员的作用。

接下来，我们的 `CreateCanvas()` 函数没有发生任何变化，但是 `InitWebGPU()` 函数发生了剧烈变化。下面让我们慢慢来看这个函数。

首先，我们在声明函数时，为 `InitWebGPU()` 函数加入了 `async` 关键字，用于表示这是一个异步函数。

```typescript
    public async InitWebGPU() {
```

### GPUAdapter 适配器

然后，我们初始化了一个叫做 `adapter` 的东西。

```typescript
        this.adapter = await navigator.gpu.requestAdapter( {

            powerPreference: 'high-performance'

        } );
```

`adapter` 的中文名字叫做**适配器**，如果你使用的是 Windows 操作系统，你可以打开设备管理器，找到你的显卡硬件那一栏，你可以看到上面写的是并不是什么显卡之类的字样，而是**显示适配器**。

![Windows 设备管理器中的显示适配器](./image/windows_hardware_manager.png)
*图为 Windows 10 操作系统中设备管理器界面中的显示适配器。*

是的，这里的 `adapter` 就是显示适配器的意思，也就是我们通常所说的**显卡**。

> 一个***适配器***代表了操作系统中一个 WebGPU 的实现。每个适配器标志着一个硬件加速器（例如 GPU 或 CPU）实例和一个浏览器在该硬件加速器之上对 WebGPU 的实现。
> 
> —— 摘自 [WebGPU 标准](https://gpuweb.github.io/gpuweb/#adapters)

以上就是 WebGPU 标准原文中对适配器的定义。这里有个很奇怪的地方，我们一直在说 GPU 的事情，为什么突然冒出了个 CPU 呢？

原因是，事实上在 GPU 被发明出来之前，大部分的图形工作都是使用中央处理器，也就是由 CPU 来承担的，在现代图形应用中，我们依然可以找到很多的应用程序在使用 CPU 绘制图形，只不过我们现在给它取了一个更好听的名字，叫做“软件渲染器”或者“软件加速”。

举个例子来说，例如和我们平常在家使用的台式机不一样，在服务器环境中，通常是没有一台硬件显示器使用 HDMI 或者 DP 接口的线缆插入到显卡的对应插槽来输出用户界面的；大多数服务器用户或开发者是使用 SSH 等命令行方式，或者远程桌面的方式来操控服务器的。

在这种情况下，操作系统并不会初始化 DirectX、Vulkan、OpenGL 之类的图形 API。没有了这些接口，应用程序自然无法使用 GPU 硬件加速的图形绘制，于是在这种情况下，软件渲染器就派上了大用场。

![3Ds Max Nitrous Software Renderer](./image/3ds_max_nitrous_software_renderer.png)

*图为 Autodesk 3Ds Max 在没有硬件加速的情况下，使用 Nitrous Software Renderer 来渲染 3D 视口。*

所以在 WebGPU 的标准中，特别注明了下面这样一段话。

> 注意：一个适配器可以是物理显示适配器（GPU），但它也可以是一个软件渲染器。返回的适配器对象可以指向不同的物理适配器，或者指向在该物理适配器之上不同的浏览器代码路径或者不同的操作系统驱动。应用程序可以同时使用多个适配器（通过 `GPUAapter` 接口）（即使有些适配器是不可用的），两个不同的适配器接口对象可以代表同一块物理适配器配置的不同实例（例如，如果在某个 GPU 被重置，或者断开连接又重新连接的情况下）。

回到代码，我们使用的是 `navigator.gpu.requestAdapter()` 接口来获取的适配器。根据 WebGPU 标准，浏览器会在页面主线程和 Web Worker 的`navigator` 这一全局对象下同时增加一个名为 `gpu` 的只读属性。

> *`gpu`* 对象定义了 `navigator.gpu` 接口，它是 WebGPU 的入口。该对象暴露了 `requestAdapter()` 方法，用于获取适配器。
> 
> —— 摘自 [WebGPU 标准](https://gpuweb.github.io/gpuweb/#gpu-interface)

这个方法是一个异步函数，如果成功将返回一个 resolve 的 `Promise<GPUAdapter>` 对象；如果获取失败，将会返回一个 reject 的 `Promis<DOMException("OperationError")>` 对象。

这个方法接受一个名为 `GPURequestAdapterOptions` 的参数，用于告诉浏览器，我们要获取一个什么样的显示适配器。

这个选项在目前主要是为桌面平台的笔记本设备服务的。

在当前大部分的 X86 架构的桌面电脑上，实际上一般都会有两个 GPU。一个是由中央处理器 CPU 提供的 GPU 部分，例如 Intel 品牌大部分的 CPU 和 AMD APU 系列都会提供一个功能相对完备但性能较弱的 GPU 硬件处理单元；另一个是通常安装在 PCI-Express 插槽上的独立显卡。

前者就是我们通常俗称的“核显”、“板载显卡”或“集成显卡”，后者我们则叫做“独显”。

你可以在上面那张 Windows 设备管理器的截图上看到，我的笔记本有两个显示适配器，一个是 Intel UHD Graphics 630，也就是核显；另一个是 NVIDIA Geforce RTX 2070，也就是独显。

在台式机上实际上也存在同样两个 GPU，但是一般我们会在装机时，通过在 BIOS 中的设定，设置为只使用独立显卡。

一般来说，独立显卡可以提供更高的性能，但是同时会带来更高的耗电，并导致散热系统硬件的负担加重，在使用风冷的电脑上，会让风扇转速增加，带来额外的噪音，并导致设备续航时间下降；与之相对的是，集成显卡虽然性能较弱，但是在耗电上却极具优势，可以延长设备的续航时间。

在 Windows 操作系统的笔记本电脑上，你可以通过显卡的控制面板，来选择默认使用哪个 GPU 和为某个应用程序指定其使用的 GPU。一般来说，操作系统会自动判断应用程序的类型，为桌面绘制和一般应用程序（例如文字处理程序、聊天软件等）启用集成显卡，为游戏启用独立显卡。

![NVIDIA 控制面板](./image/nvidia_control_panel.png)
*图为 NVIDIA 控制面板中选择默认 GPU 的界面*

回到 WebGPU 的话题，同样我们在请求适配器的时候，也可以根据当前应用的具体情况，通过 `GPURequestAdapterOptions` 参数，请求不同的显示适配器。

目前 `GPURequestAdapterOptions` 参数只有一个可选字段，就是 `powerPreference`，这个字段顾名思义就是耗电选项，它的可选值是一个名为 `GPUPowerPreference` 的枚举值。

```typescript
enum GPUPowerPreference {
    "low-power",
    "high-performance"
};
```

这个枚举类型有两个值：一个是 `"low-power"` 代表低耗电；另一个是 `"high-performance"` 代表高性能。

在 WebGPU 标准中，特别注明了应该在什么情况下使用不同的适配器。

> 注意：通常来说，如果内容不受绘制性能禁锢，应当使用低耗电的显示适配器；例如，如果每秒只渲染一帧，或者只使用简单的着色器绘制简单的几何体，或者 HTML `canvas` 元素的尺寸非常小。我们鼓励开发者在内容允许的情况下使用低耗电的显示适配器，因为它可以显著的改善移动设备的续航能力。
>
> 注意：如果选择了高性能的显示适配器，开发者应当注意，系统有可能基于省电的原因，迫使由此适配器创建的设备强制丢失。只有在开发者相信是绝对需要的情况下，才应当选择高性能的显示适配器，因为它会显著的降低移动设备的续航时间。
>
> —— 摘自 [WebGPU 标准](https://gpuweb.github.io/gpuweb/#adapter-creation)

所以，当我们未来在生产环境中，可以自由的根据应用的不同情况，来选择不同的显示适配器，这也是在 WebGL 中做不到的。

根据我的 WebGL 开发经验，Intel 系列核显的驱动经常会出问题，所以通常我会在显卡控制面板中设置优先使用高性能显卡，也就养成了这个习惯，所以在本套教程中，我尽管**不应该**，但还是选择使用了高性能的显示适配器。

好了，关于显示适配器的话题就到这里告一段落了。

不对，等等！如果一台电脑有三个显卡呢？我指的不是使用两块 NVIDIA 显卡做 [NVLink](https://zh.wikipedia.org/wiki/NVLink) 或者 [SLI](https://zh.wikipedia.org/wiki/NVIDIA_SLI)，也不是 AMD 显卡的[交火（CrossFire）技术](https://zh.wikipedia.org/wiki/AMD_CrossFire)，而是我给我的笔记本插入了一个外置显卡钨，里面安装了一个 NVIDIA Geforce RTX 2080Ti 显卡，这时候我的电脑有了三个显卡，一个核显，两个独显，甚至外接的独显比我笔记本电脑本身的独显还要好。

这时候两个独显的配置同为 `"high-performance"`，当我请求使用高性能显示适配器的时候，WebGPU 实现将会为我返回哪个显卡呢？

### glslang

接下来，我们直接执行了从 `@webgpu/glslang` 模块引入的 `glslangModule()` 函数，这也是一个异步函数。

```typescript
        this.glslang = await glslangModule();
```

其主要作用是初始化 glslang 模块，方便后续对 GLSL 语言源代码的编译。

你如果感兴趣其中的运作机制，可以直接参考 glslang 的[源代码](https://github.com/kainino0x/-webgpu-glslang)。

### GPUDevice 设备

下面，我们利用刚刚获得的适配器对象，来获取了一个称为 `GPUDevice` 的对象。

```typescript
        this.device = await this.adapter.requestDevice();
```



