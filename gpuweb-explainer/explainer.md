# 1. 概述

WebGPU 是一个让网页可以使用系统 [GPU](https://zh.wikipedia.org/zh-cn/%E5%9C%96%E5%BD%A2%E8%99%95%E7%90%86%E5%99%A8) 来实现计算和绘制复杂图形并呈现在网页内部的 Web API 提案。目标和 [WebGL](https://www.khronos.org/webgl/) 家族的 API 类似，但 WebGPU 可以访问更多更高级的 GPU 特性。在 WebGL 中，其主要用途是用于绘制图形，但是经过（相当大的努力的）改造才能用于计算，而 WebGPU 则是把 GPU 通用计算作为首要支持。

## 1.1 使用场景

如下示例场景，未能被 WebGL 2 覆盖，需要使用 WebGPU：

- 绘制物体数量庞大、高度细节化的场景图形（例如 CAD 模型）。WebGPU 的绘制命令的性能消耗比 WebGL 低很多。
- 执行高级算法用于绘制逼真的场景。由于缺乏对通用计算的支持，许多现代渲染技术和优化不能在 WebGL 2 上实现。
- 在 GPU 上部署高效的机器学习模型。尽管在 WebGL 上执行一般的 GPU（GPGPU）计算是可行的，但是实现起来非常困难，且效果欠佳。

具体示例包括：

- 使用新的渲染技术（基于 GPU 计算的粒子系统、各种后处理效果等）改进已有的 JavaScript 3D 库，例如 Babylon.js 和 Three.js，将目前只能在 CPU 端执行的复杂运算（例如裁剪、蒙皮模型变换等）迁移到 GPU 端进行。
- 将现代化游戏引擎引入网页，开启并暴露更多的高级渲染特性。例如 Unity 引擎的 WebGL 导出只支持引擎最低级的特性，但 WebGPU 则支持更多更高等级功能。
- 将新的应用形式引入网页：许多生产力软件都没有使用 GPU 计算，而现在 WebGPU 可以提供这种通用计算能力。
- 改善网络视频会议应用。例如，Google Meet 使用机器学习将用户图像与背景图像分离。在 WebGPU 上进行机器学习会让此过程计算更快、效率更高，让更多的低端设备可以使用此功能，以及使用更复杂更强健的模型数据。

## 1.2 目标

目标：

- 实现现代图形渲染技术，包括同屏和离屏。
- 实现高效率的 GPU 通用计算。
- 支持在不同本地 GPU API 上的实现，包括 Microsoft D3D12、Apple Metal、Khronos Vulkan。
- 提供一个人类可编写的语言用于指定在 GPU 上进行的计算。
- 可以植入到多进程架构的浏览器上，并且保证 Web 上的安全性。
- 尽可能的，在多种不同的用户操作系统和浏览器中，应用都可以正常工作。
- 与其他 Web 平台技术进行实用并谨慎的交互（例如以某种方式共享图像）。
- 建立一个在 Web 上暴露现代 GPU 功能的基础。 尽管对比本地 GPU API，WebGPU 的功能少很多，但是 WebGPU 在设计伊始，其架构标准，是和所有现存的本地 GPU API 一样的。同时也计划在未来扩充更多的现代功能。详见 [1.3 为什么不是“WebGL 3”](#1.3 为什么不是“WebGL 3”？)。

非目标：

- 暴露接口对完全不可编程的或缺乏灵活性的硬件提供支持，例如 DSP 或一些特定的只能用于机器学习的硬件。
- 暴露接口对不能进行通用目的计算的硬件提供支持（例如老旧的移动设备的 GPU 或更早时代的桌面 GPU）。
- 暴露所有本地 GPU API 能提供的功能（例如一些功能只适用于某个单一的 GPU 硬件厂商，或者加入到 WebGPU 后其目的过于单一）。
- 允许大规模混用 WebGL 和 WebGPU 代码。
- 与页面渲染流程如 [CSS Houdini](https://developer.mozilla.org/zh-CN/docs/Web/Guide/Houdini) 等进行强整合。

## 1.3 为什么不是“WebGL 3”？

WebGL 1.0 和 WebGL 2.0 是分别对应于 OpenGL ES 2.0 和 OpenGL ES 3.0 的 JavaScript 的映射。WebGL 的设计理念同源可以追溯到 1992 年 OpenGL 1.0 发布时（更早则可追溯到 1980 年代 IRIS GL 的时代）。这一脉络有很多优势，包括大量可用的知识体系和相对容易地将应用程序从 OpenGL ES 移植到 WebGL。

尽管如此，这也意味着 WebGL 并不与现代 GPU 的设计理念匹配，导致了很多 CPU 和 GPU 性能问题。同时也使得在现代化的本地 GPU API 之上对 WebGL 进行实现的工作变的愈发困难。[WebGL 2.0 Compute](https://www.khronos.org/registry/webgl/specs/latest/2.0-compute/) 标准是一次为 WebGL 添加通用计算功能的尝试，但是因为与本地 API 的不匹配导致这次努力异常的困难。WebGL 2.0 Compute 的标准制定者已经决定将注意力转移到 WebGPU 上。

# 2. 附加背景

## 2.1 网页浏览器中的 GPU 沙盒进程

WebGPU 的一个主要设计约束是，它必须能够在使用 GPU 进程架构的浏览器中得以实现并保持高效。相对于网页内容进程，GPU 驱动需要访问更多的系统内核调用，许多 GPU 驱动容易出现挂起或崩溃。为了提高稳定性和沙盒效应，浏览器使用了一个包含 GPU 驱动的特殊进程，并通过异步 IPC 与浏览器的其他部分通讯。在 Chromium、Gecko 和 WebKit 中已经（或将要）使用独立的 GPU 进程。

与内容进程相比，GPU 进程的沙盒化程度较低，而且它们通常在多个源之间共享。因此，它们必须验证所有的信息，例如，为了防止一个恶意进程能够查看另一个内容进程使用的 GPU 内存。WebGPU 的大部分验证规则对于确保其安全使用是必要的，所以所有的验证都需要在 GPU 进程中进行。

同样，所有的 GPU 驱动对象都只存在于 GPU 进程中，包括大型资源的分配（如缓冲区和纹理）和复杂对象（如渲染管线）。在内容进程中，WebGPU 类型（`GPUBuffer`，`GPUTexture`，`GPURenderPipeline`，......）大多只是 "句柄"，用于识别存活在 GPU 进程中的对象。这意味着 WebGPU 对象使用的 CPU 和 GPU 内存在内容进程中不需要被知道。一个 `GPUBuffer` 对象在内容进程中可能使用 150 字节的 CPU 内存，但却持有 1GB 的 GPU 内存分配。

详见标准中关于[内容和设备时间线](https://gpuweb.github.io/gpuweb/#programming-model-timelines)的部分。

## 2.2 使用 GPU 和 GPU 进程的内存可见性

目前有两种主要类型的 GPU 分别被称为 "集成 GPU "和 "独立 GPU"。独立 GPU 与 CPU 是分开的，它们通常是 PCI-e 板卡，你可以将其插入计算机的主板。集成式 GPU 与 CPU  共存于同一个芯片上，它没有自己的内存芯片；相反，它与 CPU 共享相同的内存。

当使用独立的 GPU 时，显而易见大多数 GPU 内存分配对 CPU 来说是不可见的，因为它们在 GPU 的 RAM（或 VRAM，即所谓显存）内。对于集成 GPU 来说，大多数内存分配都在相同的物理位置，但由于各种原因，对 CPU 来说是不可见的（例如，CPU 和 GPU 可以对同一块内存有各自独立的缓存，违反了缓存一致性）。反过来说，为了让 CPU 看到 GPU 缓冲区的内容，它必须被 "映射"，使其在应用程序的虚拟内存空间中可用（想想mmap()中的映射）。`GPUBuffer` 必须用特定的方式进行分配才能被映射 —— 这可能导致 GPU 访问的效率降低（例如，如果它需要被分配到内存而不是显存中）。

所有这些讨论都是围绕着本地 GPU API 进行的，但是在浏览器中，GPU 驱动程序是在 GPU 进程中加载的，所以本地 GPU 缓冲区只能在 GPU 进程的虚拟内存中进行映射。一般来说，不可能直接在内容进程中映射缓冲区（尽管有些系统可以做到这一点，并提供了可选的优化）。为了配合这种架构，需要在 GPU 进程和内容进程之间的共享内存中进行额外的 "暂存 "分配。

下表描述了哪种类型的内存在哪里可见：

|                  | 普通的 `ArrayBuffer` | **共享内存** | **可映射的 GPU 缓存** | **不可映射的 GPU 缓存（或纹理）** |
| ---------------- | -------------------- | ------------ | --------------------- | --------------------------------- |
| 内容进程中的 CPU | **可见**             | **可见**     | 不可见                | 不可见                            |
| GPU 进程中的 CPU | 不可见               | **可见**     | **可见**              | 不可见                            |
| GPU              | 不可见               | 不可见       | **可见**              | **可见**                          |

# 3. JavaScript API

本节详细介绍了 WebGPU JavaScript API 的重要和不寻常之处。一般来说，每个小节都可以被认为是自己的“小型释义”，尽管有些小节需要依赖于之前的背景上下文。

## 3.1 适配器和设备

WebGPU “适配器”（`GPUAdapter`）是一个标识系统中特定 WebGPU 实现的对象（例如，集成或独立 GPU 上的硬件加速实现，或软件实现）。同一页面上的两个不同的`GPUAdapter` 对象可以指同一个底层实现，也可以指两个不同的底层实现（例如，集成和独立GPU）。

在页面上有哪些适配器集合可用，是由用户代理决定的。

一个 WebGPU "设备"（`GPUDevice`）表示与 WebGPU 适配器的逻辑连接。它被称为 "设备"，是因为因为它抽象了底层的实现（显卡），并封装了一个单一的连接：当在代码中声明了一个设备，就可以像是适配器的唯一用户一样进行各种操作。作为这种封装的一部分，设备拥有它创建的所有 WebGPU 对象（例如纹理等）的最底层控制权，每当设备丢失或销毁时，这些对象可以被（内部）释放。同一个网页上的不同组件都可以有各自的 WebGPU 设备。

所有 WebGPU 的使用都是通过 WebGPU 设备或由它创建的对象完成的。在这个意义上，它等同于 `WebGLRenderingContext ` 的一部分；但是，与`WebGLRenderingContext` 不同，它不与画布对象相关联，而且大多数命令是通过子对象发出的。

### 3.1.1 选择适配器和初始化设备

想要获取一个适配器，应用程序需要调用 `navigator.gpu.requestAdapter()` 方法，同时该方法有一个可选参数会影响到获取到什么样的适配器，例如 `powerPreference` 参数（`"low-power"` 或 `"high-performance"`），而 `forceSoftware` 将会强迫指向一个软件实现。

`requestAdapter()` 方法永远都不会 `reject` ，但是当根据指定的参数无法返回一个对应的适配器时，可能会 `resolve` 一个 `null` 值。

返回的适配器会携带一个 `name` 属性（由底层实现指定），一个名为 `isSoftWare` 的布尔值，因此应用程序如果不想使用速度较慢的软件实现，或者适配器未能达到预想的 3.1.2 章节中描述可用能力，应用程序可以使用回调函数，回滚到 WebGL 或 Canvas2D。

```javascript
const adapter = await navigator.gpu.requestAdapter(options);
if (!adapter) return goToFallback();
```

想要获取一个设备，应用程序需要调用 `adapter.requestDevice()` 方法，同时该方法有一个可选参数，其中描述了更多可选能力。详见 3.1.2 可选能力章节。

`requestDevice()` 方法只有在请求非法时才会 `reject` ，例如超出了适配器的能力。如果在设备的创建过程中发生了错误，该方法依然会 `resolve` 一个 `GPUDevice` 但该设备在 `resolve` 时已经发生了设备丢失。详见 3.4 设备丢失章节（这种设计简化了应用程序需要处理的异常状况的数量，避免了其他的可能性，例如返回 `null` 值或其他异常类型）。

```javascript
const device = await adapter.requestDevice(descriptor);
device.lost.then(recoverFromDeviceLoss);
```

适配器有可能变为不可用状态，例如显卡被从系统中拔出、为了省电设备被禁用、或被标记为“stale”。从此时起，该适配器无法提供可用的设备，并且永远会返回已经丢失的设备。

### 3.1.2 可选能力

每个适配器都有不同的可选能力，即所谓的“特性”和“限制”。这些能力的最大值可以在设备被创建时被请求获取。

每个适配器暴露的不同能力，是由用户代理决定的。

在创建设备时，可以在上述的 `adapter.requestDevice()` 方法的参数中，精确指定每项能力。

当任何操作被应用到一个设备上时，它会严格按照设备的能力进行验证——而不是适配器的能力。这就避免了对开发系统能力的隐性依赖，从而简化了便携式应用程序的开发。

## 3.2 对象的验证和销毁

### 3.2.1 WebGPU 的错误处理

Contagious Internal Nullability， 传染性的内部无效机制，即 [Transparent promise pipelining](http://erights.org/elib/distrib/pipeline.html)，透明 Promise 管线。

WebGPU 在使用时是一个调用频次很高的 API，一些应用程序每帧要进行数以万计的调用来渲染复杂的场景。我们已经知道，GPU 进程需要验证这些命令以满足其安全性。为了避免在 GPU 和内容进程中两次验证命令的开销，WebGPU 被设计为让 JavaScript 调用可以直接转发到 GPU 进程并在那里进行验证。关于在哪里验证以及如何报告错误的更多细节，请参见错误部分。

同时，在一个单帧中，许多 WebGPU 对象是否能够被成功创建，往往依赖于另一个对象。例如，一个 `GPUCommandBuffer` 可以记录在同一帧中创建并临时使用的`GPUBuffer` 的命令。在这个例子中，由于 WebGPU 的性能限制，不可能将创建 `GPUBuffer` 的消息发送给 GPU 进程，并在继续执行 JavaScript 之前同步地等待其处理。

相反，在 WebGPU 中，所有对象（如 `GPUBuffer` ）都是在内容时间线上立即创建并返回给 JavaScript 的。验证工作几乎都是在 "设备时间线 "上异步完成的。在好的情况下，当没有错误发生时，一切在 JavaScript 看来都是同步的。然而，当一个调用发生错误时，它就变成了一个无效操作（除了错误报告）。如果该调用返回一个对象（如 `createBuffer` 方法），该对象会在 GPU 进程侧被标记为 "无效"。

由于验证和内存分配是异步进行的，所以错误也是异步报告的。就其本身而言，这可能会给调试带来挑战 —— 参见 3.3.1.1 调试章节。

所有 WebGPU 调用都会验证每一个参数是否为有效对象。因此，如果一个调用使用了一个无效的 WebGPU 对象并返回一个新的对象，那么新的对象也是无效的（因此称为 "传染"，Contagious ）。

***图表1** 进程间消息传递的时间线，展示了错误在非同步的情况下是如何传递的*

![figure1](D:\Code\gpuweb-explainer\figure1.svg)

> 代码示例 1
>
> 使用 API 时，当所有调用都合法，其看起来像是一个同步操作：
>
> ```javascript
> const srcBuffer = device.createBuffer({
>     size: 4,
>     usage: GPUBufferUsage.COPY_SRC
> });
> 
> const dstBuffer = ...;
> 
> const encoder = device.createCommandEncoder();
> encoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, 4);
> 
> const commands = encoder.finish();
> device.queue.submit([commands]);
> ```

> 代码示例 2
>
> 当创建对象时，错误会“传染性”的进行传递：
>
> ```javascript
> // 这个缓冲区的大小太大了，因此会触发内存溢出错误，导致 `srcBuffer` 不可用
> const srcBuffer = device.createBuffer({
>     size: BIG_NUMBER,
>     usage: GPUBufferUsage.COPY_SRC
> });
> 
> const dstBuffer = ...;
> 
> // 创建一个有效的编码器
> const encoder = device.createCommandEncoder();
> // 特殊情况出现：当编码器使用了一个不可用的对象来编码 GPU 指令，编码器本身也会变成不可用状态
> encoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, 4);
> 
> // 因为编码器本身已经不可用了，所以 `encoder.finish()` 命令也不可用，并会返回一个不可用的对象
> const commands = encoder.finish();
> // 引用指令本身已经是不可用了，所以就会成为一个无效操作
> device.queue.submit([commands]);
> ```

#### 3.2.1.1 思想模型

对 WebGPU 语义的一种解释是，每个 WebGPU 对象在内部实际上是一个 Promise，所有 WebGPU 方法都是  `async` 和 `await` 的异步方法，在使用这些方法返回的每个WebGPU 对象作为参数之前都要等待。同时，异步代码的执行实际上是被外包给了 GPU 进程（在那里实际上才是同步进行的）。

另一种理解方式，更接近于实际的实现细节，就是设想每个 GPU 开头的 JavaScript 对象，实际对应着 GPU 进程上的一个 C++/Rust 里的 GPU 内部对象，该对象拥有一个名为 `isValid` 的布尔值属性。然后在 GPU 进程上验证每个命令时，都会检查 `isValid`，如果验证失败就会返回一个新的、无效的对象。但是就在同时，在内容进程里，该对象的 JavaScript 实现（即 GPU 开头的 JavaScript 对象）还并不知道此对象是否有效。

### 3.2.2 WebGPU 对象的早期销毁

WebGPU 对象的大部分内存占用是在 GPU 进程中的：它可以是 `GPUBuffer` 和 `GPUTexture` 等对象占用的的 GPU 显存，`GPURenderBundles` 在 CPU 内存中持有的序列化命令，或者 `GPUShaderModule` 中 WGSL 抽象语法树中的复杂对象图元。JavaScript 的垃圾回收机制（GC）是存在于页面渲染进程中的，它并不知道 GPU 进程中的内存使用情况。浏览器有很多策略可以触发 GC，其中一个常见的策略就是在内存受到压力的情况下触发。然而，一个 WebGPU 对象可以在 GC 不知道的情况下持有数 MB 甚至上 GB 的内存，并且永远不会触发内存受压事件。

对于 WebGPU 应用程序来说，能够直接释放一些 WebGPU 对象所使用的内存而不需要等待 GC 是很重要的。例如，应用程序可能会在每一帧创建临时纹理和缓冲区，如果没有明确的 `.destroy()` 调用，它们会很快耗尽 GPU 的显存。这就是为什么 WebGPU 在这些对象类型上有一个 `.destroy()` 方法，它可以决断一定数量的内存保留与否。它标志着应用程序不再需要该对象的内容，可以尽快释放它。当然，在调用 `.destroy()` 方法后，如果再使用该对象将抛出一个验证错误。

> 示例代码 3
>
> ```javascript
> const dstBuffer = device.createBuffer({
>     size: 4
>     usage: GPUBufferUsage.COPY_DST
> });
> 
> // 这个缓冲区没有被销毁（是可用的），命令将成功执行！
> device.queue.writeBuffer(dstBuffer, 0, myData);
> 
> buffer.destroy();
> 
> // 这个缓冲区现在被销毁了，使用它其中的数据的命令将会触发验证错误
> device.queue.writeBuffer(dstBuffer, 0, myData);
> ```

请注意，虽然这看起来与因为错误导致的无效缓冲区的行为有些相似，但它是不同的。与前述的错误导致的无效性不同，销毁与否是在创建后发生的，它不具有传染性，并且只有在实际提交操作时（例如 `queue.writeBuffer()`  或 `queue.submit()` ）才会被验证，而不是在创建依赖对象时（如命令编码器，见上文）就会验证。

## 3.3 错误处理

简而言之，应用程序的错误处理应当和 JavaScript 的异常处理同步进行。但是对于多进程的 WebGPU 实现来说，这样做的成本过高。

参见 #3.2 对象的验证和销毁 章节的内容，其中也描述了*浏览器*是如何处理错误的。

### 3.1.1 问题和解决方案

开发者和应用程序需要在多种不同的情况下进行错误处理：

- *调试*。在开发过程中同步获得错误，然后在调试器中引发断点。
- *致命错误*。处理设备或适配器的丢失，采取重建 WebGPU 环境或回滚到非 WebGPU 内容。
- *容错的内存分配*。在分配 GPU 显存资源时检测是否超出显存限制。
- *容错验证*。在应用程序的单元或整合测试中、WebGPU 一致性测试中、在数据驱动的应用程序中检测错误（例如加载超过设备能力极限的 glTF 模型）的过程中，验证 WebGPU 调用是否成功。
- *应用遥测*。在网页应用部署之后收集错误日志，用于缺陷上报和埋点。

下面的章节将会详细阐述如上情况下遇到的细节问题以及如何解决。

#### 3.3.1.1 调试

**解决方案：**开发者调试工具

WebGPU 实现应当提供一种实现同步验证的方式，例如通过在开发者调试工具中提供“在 WebGPU 出现错误时中断程序”的选项。

在每一次 WebGPU 调用的验证过程中，这种方式可以通过在内容进程 ⇆ GPU 进程中的回环来实现，尽管在实践中这个过程会非常慢。但是可以通过在内容进程中运行一个“预先”验证的步骤镜像来进行优化，它要么忽略显存溢出错误（因为它无法预测显存是否溢出），要么只对可能造成显存溢出错误的调用才使用回环验证。

#### 3.3.1.2 致命错误：适配器和设备丢失

**解决方案：** #3.4 设备丢失

#### 3.3.1.3 容错的资源分配、容错的验证和遥测

**解决方案：** 错误作用域 Error Scopes

相关背景请参见 #3.2 对象的验证和销毁 章节。比较特别的地方在于，所有的错误（验证错误和内存溢出错误）都是在远程线程中异步检测的。在 WebGPU 标准中，我们把每个 WebGPU 设备的工作线程称为 "设备时间线"。

因此，应用程序需要一种方法来指示设备时间线如何处理每个错误。为了解决这个问题，WebGPU 使用了错误作用域（Error Scopes）。

### 3.3.2 错误作用域

WebGL 使用一个叫做 `getError` 的函数来暴露错误，它会返回自从上次 `getError` 被调用后的第一个错误。这个机制很简单，但是有两个问题：

- 它是同步的，会产生一个往返的回环过程，并要求所有先前发出的命令操作都要完成。我们通过异步返回错误来解决这个问题。
- 它的这种扁平状态模型很脆弱：错误可能会泄漏到或来自不相关的代码，例如库、中间件、浏览器扩展等。我们用一个错误 "作用域 "的堆栈来解决这个问题，允许每个组件密封地捕获和处理自己的错误。

在 WebGPU 中，每个设备[^1]都维护着一个持久存在的 "错误作用域 "堆栈状态。在初始状态下，设备的错误作用域堆栈是空的。`GPUDevice.pushErrorScope('validation')` 或 `GPUDevice.pushErrorScope('out-of-memory')` 开启一个错误作用域并将其压栈到堆栈中。这个作用域只捕获特定类型的错误，这取决于应用程序想要检测哪种错误类型。很少需要同时检测这两种错误，所以需要两个嵌套的错误作用域来实现。

`GPUDevice.popErrorScope()` 结束一个错误作用域，将其从堆栈中弹出，并返回一个 `Promise<GPUError?>`，一旦封闭操作完成就会立即 `resolve` 并回报错误。其中精确得包含了在入栈和出栈调用之间发出的所有错误操作。如果没有捕捉到错误，它将 `resolve` 一个 `null` 值，否则将 `resolve` 一个错误对象，该对象描述了作用域内捕捉到的第一个错误，`GPUValidationError` 或 `GPUOutOfMemoryError`。

任何设备时间线上的操作错误，都会被传递到该操作执行时堆栈上最顶端的错误作用域。

- 如果一个错误作用域捕获了一个错误，这个错误不会被向下传递。每个错误作用域只存储它捕获的**第一个**错误；它捕获的任何其他错误都会被**静默忽略**。

- 如果没有，错误就会顺着堆栈向下传递到封闭的错误作用域。

- 如果一个错误到达堆栈的底部，它**可能**[^2]会触发 `GPUDevice` [^3]上的 `uncapturederror` 事件（也可能同时抛出一个控制台警告）。

[^1]: 在3.6多线程章节中计划加入如下内容，错误作用域状态实际上是按设备、按环境划分的。也就是说，当一个 `GPUDevice` 第一次被发送到一个 `Worker` 上时，该设备+环境的错误作用域堆栈总是空的。 如果一个 `GPUDevice` 被复制回它已经存在的执行环境，它将与该执行环境上的所有其他副本共享其错误作用域）。
[^2]: 实现可能不会选择总是为一个既定的错误触发事件，例如如果它已经触发了太多次，太多次太频繁，或者有太多同类的错误。这类似于今天 WebGL 的调试控制台警告的工作方式。对于代码质量不高应用程序，这种机制可以防止事件的频繁触发对系统性能产生严重影响。
[^3]: 更具体地说，根据 #3.6 多线程章节，这个事件将只存在于原生的 `GPUDevice`（来自 `createDevice` 的那个，而不是接受消息的）；非原生的设备对象将会有一个不同的接口。

```typescript
enum GPUErrorFilter {
    "out-of-memory",
    "validation"
};

interface GPUOutOfMemoryError {
    constructor();
};

interface GPUValidationError {
    constructor(DOMString message);
    readonly attribute DOMString message;
};

typedef (GPUOutOfMemoryError or GPUValidationError) GPUError;

partial interface GPUDevice {
    undefined pushErrorScope(GPUErrorFilter filter);
    Promise<GPUError?> popErrorScope();
};
```

#### 3.3.2.1 如何解决内存资源分配的容错问题

如果一个分配 GPU 显存的调用（例如 `createBuffer` 或 `createTexture`）失败了，产生的对象是无效的（和发生验证错误一样），但会产生一个 `'out-of-memory'` 错误，可以用 `'out-of-memory'` 错误作用域来检测它。

**示例：`tryCreateBuffer`**

```javascript
async function tryCreateBuffer(device: GPUDevice, descriptor: GPUBufferDescriptor): Promise<GPUBuffer | null> {
  device.pushErrorScope('out-of-memory');
  const buffer = device.createBuffer(descriptor);
  if (await device.popErrorScope() !== null) {
    return null;
  }
  return buffer;
}
```

由于实现中可能出现的众多内存不足的情况，这与缓冲区映射错误情况有微妙的关系，在这里就不做详细解释了。错误处理设计的原则是，应用程序代码应该需要尽可能处理极少数的边缘情况，这些不同的情况都会导致相同的行为。

此外，还有（将有）关于大多数 `Promise` 的相对顺序的规则，以防止非可移植的浏览器行为或异步代码之间竞赛导致的问题。

#### 3.3.2.2 如何解决验证的容错问题

如上所述，可以使用 `validation` 错误作用域来检测验证错误。

示例：测试

```javascript
device.pushErrorScope('out-of-memory');
device.pushErrorScope('validation');

{
  // (做一些不应该产生错误的操作)

  {
    device.pushErrorScope('validation');
    device.doOperationThatIsExpectedToError();
    device.popErrorScope().then(error => { assert(error !== null); });
  }

  // (再做一些不应该产生错误的操作)
}

// 检测异常错误
device.popErrorScope().then(error => { assert(error === null); });
device.popErrorScope().then(error => { assert(error === null); });
```

#### 3.3.2.3 如何解决应用程序遥测问题

如上所述，如果一个错误没有被错误作用域捕获，它可能会触发原生设备的 `uncapturederror` 事件。应用程序应当监视此事件，或者用处理错误的作用域封装应用程序的这部分代码，去检测产生的错误报告。

`uncapturederror` 事件并不是解决这个问题所必需的，但它的好处是为所有线程的未捕获错误提供一个单一的数据流。

#### 3.3.2.4 错误消息和调试标签

每个 WebGPU 对象都有一个可读写属性 `label` ，应用程序可以设置该属性并为调试工具（错误消息、本地性能分析工具，如 XCode 等）提供信息。每个 WebGPU 对象建立时的描述参数（`descriptor`）也都有一个名为 `label` 的成员用于设置该属性的初始值。

另外，可以使用调试标签和调试组来标记部分命令缓冲。参见 #3.7.1 调试标签和调试组。

对于本地调试（使用开发者工具）和应用程序遥测（`uncapturederror`），利用对象调试标签的优势，实现可以选择在它们的错误信息中报告某种 "堆栈跟踪"。例如，一个调试信息字符串可以是：

```
<myQueue>.submit failed:
- commands[0] (<mainColorPass>) was invalid:
- in the debug group <environment>:
- in the debug group <tree 123>:
- in setIndexBuffer, indexBuffer (<mesh3.indices>) was invalid:
- in createBuffer, desc.usage (0x89) was invalid
```

### 3.3.3 其他

类似于 WebGL 中的同步的 `getError` 方案，在 #3.3.2 错误作用域中进行了讨论。

基于回调函数的错误作用域：`device.errorScope('out-of-memory', async () => { ... })`。由于有必要允许在错误作用域内进行异步操作，这种表述实际上在很大程度上等同于上面所示的表述，因为回调永远无法 `resolve`。应用程序架构会受到兼容调用堆栈的限制，或者他们会把基于回调的 API 重构为基于压栈、出栈的 API。最后，如果错误作用域变得不平衡，一般不会造成灾难，尽管堆栈可能无限制地增长，导致最终崩溃（或设备丢失）。

## 3.4 设备丢失

任何阻止进一步使用 `GPUDevice` 的情况都会导致设备丢失。这些情况可以是因为 WebGPU 调用或外部事件引起的；例如：`device.destroy()`，不可恢复的内存不足情况，GPU 进程崩溃，长时间操作导致 GPU 重置，由其他应用程序引起的 GPU 重置，独立 GPU 被关闭以节省电力，或外置 GPU 的插头被拔出等。

设计原则：应该有尽可能少的不同形式的错误行为。这使得开发者更容易测试他们的应用程序在不同情况下的行为，提高应用程序的鲁棒性，并提高浏览器之间的可移植性。

> ISSUE 3 完成此段释义（参见  [ErrorHandling.md](https://github.com/gpuweb/gpuweb/blob/main/design/ErrorHandling.md#fatal-errors-requestadapter-requestdevice-and-devicelost)）。

## 3.5 缓冲区映射

`GPUBuffer` 代表了可被其他 GPU 操作使用的在显存上分配的一小块范围。这块内存可以被线性访问，与 `GPUTexture` 相反，纹理序列的实际内存布局是未知的。可以把 `GPUBuffers` 看作是 `gpu_malloc()` 的结果。

CPU → GPU。当使用 WebGPU 时，应用程序需要非常频繁地将数据从 JavaScript 传输到 `GPUBuffer`，而且数据量可能很大。这包括网格数据、绘制和计算参数、机器学习的模型输入等。这就是为什么需要一个有效的方法来更新 `GPUBuffer` 数据。`GPUQueue.writeBuffer` 的效率相当高，但与使用映射的方式写入缓冲区相比，它需要至少包含一个额外的拷贝。

GPU→CPU。应用程序也经常需要从 GPU 向 JavaScript 传输数据，尽管通常不太频繁，数量也较少。这包括屏幕截图、计算结果的数据、机器学习的推断结果等。这种传输是通过读取缓冲区然后通过映射来完成的。

关于多种不同类型的内存缓冲区的映射的说明，可以参见 #2.2 GPU 和 GPU 进程的内存可见性。

### 3.5.1 在 CPU 和 GPU 之间所有权的转移

在本地 GPU API 中，当一个缓冲区被映射时，它的内容可以被 CPU 访问。同时，GPU 也可以持续使用缓冲区的内容，这可能导致 CPU 和 GPU 之间的数据竞赛。这意味着被映射的缓冲区使用起来很简单，但把同步问题留给了应用程序。

相反，WebGPU 为了保证可移植性和一致性，阻止了几乎所有的数据竞赛。在 WebGPU 中，由于某些驱动可能需要额外的 "共享内存 "，在此块映射缓冲区上的竞赛的风险更大，降低了可移植性。这就是为什么 `GPUBuffer`  的映射是作为 CPU 和 GPU 之间的所有权转移来完成的。在每个瞬间，两者中只有一个可以访问它，所以不可能有竞赛。

```typescript
typedef [EnforceRange] unsigned long GPUMapModeFlags;
namespace GPUMapMode {
    const GPUFlagsConstant READ  = 0x0001;
    const GPUFlagsConstant WRITE = 0x0002;
};

partial interface GPUBuffer {
  Promise<undefined> mapAsync(GPUMapModeFlags mode,
                              optional GPUSize64 offset = 0,
                              optional GPUSize64 size);
};
```

> 示例代码 4
>
> 可以如下使用：
>
> ```javascript
> // 将缓冲区进行映射以便写入数据，这里使用了默认的 offset 和 size
> // 所以整个缓冲区都将被映射
> const myMapWriteBuffer = ...;
> await myMapWriteBuffer.mapAsync(GPUMapMode.WRITE);
> 
> // 将缓冲区进行映射以便读取数据，只有前四个字节被映射
> const myMapReadBuffer = ...;
> await myMapReadBuffer.mapAsync(GPUMapMode.READ, 0, 4);
> ```

一旦应用程序在 CPU 上完成了对缓冲区的使用，它可以通过取消映射将所有权转移回 GPU。这是一个即时操作，使应用程序失去对 CPU 上的缓冲区的所有访问权（即解绑 `ArrayBuffer`）。

```typescript
partial interface GPUBuffer {
  undefined unmap();
};
```

> 示例代码 5
>
> 可以如下使用：
>
> ```javascript
> const myMapReadBuffer = ...;
> await myMapReadBuffer.mapAsync(GPUMapMode.READ, 0, 4);
> // 对映射缓冲区进行操作
> buffer.unmap();
> ```

当把所有权转移到 CPU 时，可能需要从底层映射的缓冲区拷贝数据到内容进程可见的共享内存。为了避免过量复制，应用程序可以在调用 `GPUBuffer.mapAsync`时指定感兴趣的数据范围。

`GPUBuffer.mapAsync` 的模式参数控制了哪种类型的映射操作被执行。目前，它的值与缓冲区创建时使用的标志是重复冗余的，但它的存在是为了强化明确性和未来的可扩展性。

当 `GPUBuffer` 被 CPU 拥有时，不可能在设备时间线上提交任何使用它的操作；否则，会产生一个验证错误。然而，使用 `GPUBuffer` 来记录 `GPUCommandBuffer`是有效的（并且建议使用！）。

### 3.5.2 建立可映射的缓冲区

`GPUBuffer` 的底层缓冲区的物理内存位置取决于它是否是可映射的，以及它之所以被映射是用于读取还是写入的（例如，本地 API 对 CPU 缓存行为给予一些控制）。目前，可映射的缓冲区只能用于传输数据（所以它们除了用于 `MAP_*` 外，只能正确用于 `COPY_SRC` 或 `COPY_DST`），这就是为什么应用程序在创建缓冲区时必须指定它们的用途，（目前）也就是使用相互排斥的 `GPUBufferUsage.MAP_READ` 和 `GPUBufferUsage.MAP_WRITE` 去标识该缓冲区。

> 示例代码 6
>
> ```javascript
> const myMapReadBuffer = device.createBuffer({
>     usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
>     size: 1000,
> });
> const myMapWriteBuffer = device.createBuffer({
>     usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
>     size: 1000,
> });
> ```

### 3.5.3 访问被映射的缓冲区

一旦一个 `GPUBuffer` 被映射，就可以从 JavaScript 中访问它的内存。这是通过调用 `GPUBuffer.getMappedRange` 完成的，它返回一个叫做 "映射范围"的ArrayBuffer。在调用 `GPUBuffer.unmap` 或 `GPUBuffer.destroy` 之前，这个 ArrayBuffer 都是可用的，但调用前述二者之后它们就会被分离。这些 ArrayBuffer 通常不是新分配的内存，而是指向内容进程可见的某种共享内存（IPC共享内存、mmapped文件描述符等等）的指针。

当把所有权转移到 GPU 时，可能需要从共享内存拷贝到底层映射的缓冲区。`GPUBuffer.getMappedRange` 提供一个可选的缓冲范围来映射（对于这个范围，`offset`  0 代表缓冲区的开始）。这样，浏览器就知道底层 `GPUBuffer` 的哪些部分已经 "失效"，从而更新内存映射。

该范围必须被包含在 `mapAsync()` 中要求的区间内。

```typescript
partial interface GPUBuffer {
  ArrayBuffer getMappedRange(optional GPUSize64 offset = 0,
                             optional GPUSize64 size);
};
```

> 示例代码 7
>
> 可以如下使用：
>
> ```javascript
> const myMapReadBuffer = ...;
> await myMapReadBuffer.mapAsync(GPUMapMode.READ);
> const data = myMapReadBuffer.getMappedRange();
> // 对数据进行操作
> myMapReadBuffer.unmap();
> ```

### 3.5.4 在创建缓冲时进行映射

一个常见的需求是创建一个已经充满了一些数据的 `GPUBuffer`。这可以通过创建一个最终缓冲区，然后再创建一个可映射缓冲区，用数据填充可映射缓冲区，然后从可映射缓冲区复制到最终缓冲区来实现，但这种方法是非常低效的。相反，可以通过在创建时使缓冲区所有权归为 CPU 来实现：我们称之为 "创建时映射"。所有缓冲区都可以在创建时被映射，即使它们的用途没有被标记为 `MAP_WRITE` 。浏览器将为应用程序处理数据传输到缓冲区的问题。

一旦一个缓冲在创建时被映射，它就会像普通被映射的缓冲区一样。`GPUBUffer.getMappedRange()` 被用来检索 ArrayBuffer，而所有权则通过 `GPUBuffer.unmap()`转移到 GPU 上。

> 示例代码 8
>
> 通过在创建缓冲的 `descriptor` 中传递 `mappedAtCreation: true` 参数，在创建缓冲时进行映射：
>
> ```javascript
> const buffer = device.createBuffer({
>     usage: GPUBufferUsage.UNIFORM,
>     size: 256,
>     mappedAtCreation: true,
> });
> const data = buffer.getMappedRange();
> // 写入数据
> buffer.unmap();
> ```

当使用高级方法将数据传输到 GPU 时（例如使用一个已经映射或正在映射的缓冲区的滚动列表），在创建时将缓冲区进行映射可以用于立即创建额外的空间，以放置要传输的数据。

### 3.5.5 示例

> 示例代码 9
>
> 使用优化的方式创建缓冲区并赋予初始值，例如这里我们填充了一个使用 Draco 压缩算法的 3D 网格：
>
> ```javascript
> const dracoDecoder = ...;
> 
> const buffer = device.createBuffer({
>     usage: GPUBuffer.VERTEX | GPUBuffer.INDEX,
>     size: dracoDecoder.decompressedSize,
>     mappedAtCreation: true,
> });
> 
> dracoDecoder.decodeIn(buffer.getMappedRange());
> buffer.unmap();
> ```

> 示例代码 10
>
> 从 GPU 端渲染的纹理中回收数据：
>
> ```javascript
> const texture = getTheRenderedTexture();
> 
> const readbackBuffer = device.createBuffer({
>     usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
>     size: 4 * textureWidth * textureHeight,
> });
> 
> // 从纹理向缓冲区拷贝数据
> const encoder = device.createCommandEncoder();
> encoder.copyTextureToBuffer(
>     { texture },
>     { buffer, rowPitch: textureWidth * 4 },
>     [textureWidth, textureHeight],
> );
> device.submit([encoder.finish()]);
> 
> // 在 CPU 端获取数据
> await buffer.mapAsync(GPUMapMode.READ);
> saveScreenshot(buffer.getMappedRange());
> buffer.unmap();
> ```

> 示例代码 11
>
> 在单帧中更新 GPU 端数据：
>
> ```javascript
> void frame() {
>  // 为了达到更新的目的，创建一个新的缓冲区
>  // 当然，在实践中我们通常会通过重映射的方式复用帧间缓冲区
>  const stagingBuffer = device.createBuffer({
>      usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
>      size: 16 * objectCount,
>      mappedAtCreation: true,
>  });
>  const stagingData = new Float32Array(stagingBuffer.getMappedRange());
> 
>  // 对于每次绘制：
>  //  - 把绘制数据放进 stagingData
>  //  - 记录一个 stagingData 的拷贝到 uniform 变量
>  //  - 编码绘制命令
>  const copyEncoder = device.createCommandEncoder();
>  const drawEncoder = device.createCommandEncoder();
>  const renderPass = myCreateRenderPass(drawEncoder);
>  for (var i = 0; i < objectCount; i++) {
>      stagingData[i * 4 + 0] = ...;
>      stagingData[i * 4 + 1] = ...;
>      stagingData[i * 4 + 2] = ...;
>      stagingData[i * 4 + 3] = ...;
> 
>      const {uniformBuffer, uniformOffset} = getUniformsForDraw(i);
>      copyEncoder.copyBufferToBuffer(
>          stagingBuffer, i * 16,
>          uniformBuffer, uniformOffset,
>          16);
> 
>      encodeDraw(renderPass, {uniformBuffer, uniformOffset});
>  }
>  renderPass.endPass();
> 
>  // 我们已经完成了缓冲区的数据填充，将其 unmap()
>  // 然后我们就可以提交命令了
>  stagingBuffer.unmap();
> 
>  // 提交所有的拷贝和所有的绘制命令
>  // 拷贝命令会在绘制命令之前发生
>  // 所以每次绘制命令都会使用之前在 for 循环中填充的数据
>  device.queue.submit([
>      copyEncoder.finish(),
>      drawEncoder.finish()
>  ]);
> }
> ```
>

## 3.6 多线程

多线程是现代图形 API 的一个关键部分。与 OpenGL 不同，较新的 API 允许应用程序同时从多个线程编码命令、提交操作、向 GPU 传输数据等等，从而缓解了 CPU 的瓶颈。这与 WebGPU 特别相关，因为 IDL 绑定通常比 C 调用慢得多。

目前，WebGPU 还不允许多个线程共同使用单个 GPU 设备，但 API 的设计从一开始就考虑到了这一点。本章节描述了暂定计划中的工作原理。

正如 2.1 网页浏览器中的 GPU 沙盒进程 所述，大多数 WebGPU 对象实际上只是一个指向浏览器 GPU 进程中的对象的 "句柄"。因此，允许这些 WebGPU 对象在线程之间共享是相对简单的。例如，一个 `GPUTexture` 对象可以简单地被 `postMessage()` 到另一个线程，创建一个新的 `GPUTexture` JavaScript 对象，其中包含一个指向 GPU 进程中同一个（引用计数）对象的句柄。

一些对象，如 `GPUBuffer`，有客户端状态。应用程序仍然需要从多个线程中使用它们，而不需要用 `[Transferable]` 语义来 `postMessage` 回此类对象（这也会创建新的封装对象，破坏旧的引用）。因此，这些对象也将是可序列化 `[Serializable]` 的，但同时包含少量的（内容侧）共享状态，就像 SharedArrayBuffer。

尽管对这种共享状态的访问有一定的限制 —— 它不能在单个对象上任意快速地改变 —— 但它仍然可能是一个可以被时序攻击的载体，就像 SharedArrayBuffer 一样，所以它暂时被限定在跨域隔离的范围内。请参考[时序攻击](https://gpuweb.github.io/gpuweb/#security-timing)。

> 示例 12
>
> 已知有主线程 Main 和子线程 Worker：
>
> - 主线程：`const B1 = device.createBuffer(...);`
>
> - 主线程：使用 `postMessage` 将 `B1` 发送的 Worker 线程
>
> - 子线程：接收消息对象为 → `B2`
>
> - 子线程：`const mapPromise = B2.mapAsync()` → 成功让 `B2` 进入“待映射”状态
>
> - 主线程：`B1.mapAsync()` →  **抛出异常**（并且不会改变此缓冲区的状态）
>
> - 主线程：使用 `B1` 做某些命令编码，例如：
>
>   ```javascript
>           encoder.copyBufferToTexture(B1, T);
>           const commandBuffer = encoder.finish();
>   ```
>
>   → 成功，因为这些操作并不依赖于缓冲区的状态
>
> - 主线程：`queue.submit(commandBuffer)` → 发生 WebGPU 异步错误，因为 CPU 目前依然掌握着此缓冲区的所有权
> - 子线程：`await mapPromise`，写入映射，然后调用 `B2.unmap()`
> - 主线程：`queue.submit(commandBuffer)` → 成功
> - 主线程：`B1.mapAsync()` → 成功将次缓冲区进入“待映射”状态

进一步的讨论可以在 [#354](https://github.com/gpuweb/gpuweb/issues/354) 中找到（注意不是所有的讨论都反映了当前的想法）。

### 3.6.1 未解决的：同步对象传递

一些应用程序架构需要在线程之间传递对象，而不必异步地等待消息到达接收线程上。

此类架构中最关键的一类是 WebAssembly 应用程序。使用 WebGPU 的本地 C/C++/Rust 等绑定的程序将希望假设对象句柄是普通数据（例如 typedef struct WGPUBufferImpl* WGPUBuffer;），它们可以在线程之间自由传递。不幸的是，在 C-on-JS 绑定中（例如 Emscripten），如果没有复杂的、隐藏的、缓慢的异步性（在接收线程上妥协，中断发送线程以发送消息，然后在接收线程上等待对象），就不能实现这一点。

在 [#747](https://github.com/gpuweb/gpuweb/issues/747) 中提到了一些替代解决方案。

- SharedObjectTable，一个具有共享状态的对象（像 SharedArrayBuffer），包含一个可序列化值的表格。有效地，存储到表中的数据将被序列化一次，然后任何拥有 SharedObjectTable 的线程都可以（同步地）根据需要反序列化该对象。

- 一个同步的 `MessagePort.receiveMessage()` 方法。这是不太理想的，因为它需要任何创建这些对象的线程急切地将其发送给每个线程，以防它们以后需要它。

- 允许为一个对象 "导出 "一个数字 ID，可以用来在另一个线程上 "导入 "该对象。这个方法绕过了垃圾收集器，使其很容易造成内存泄漏。

## 3.7 命令编码和提交

WebGPU 中的许多操作是纯粹的 GPU 端操作，不需要使用来自 CPU 的数据。这些操作不是直接发出的，而是通过类似构建器的 `GPUCommandEncoder` 接口编码到 `GPUCommandBuffer` 中的，然后再通过 `gpuQueue.submit()` 发送到 GPU 中。这种设计也被底层的本地 API 所采用。它有如下优点：

- 命令缓冲区编码是独立于其他状态的，允许编码（和命令缓冲区验证）工作利用多个 CPU 线程。

- 一次性提供更大的操作命令块，允许 GPU 驱动做更多的全局优化，特别是在如何跨 GPU 硬件调度工作方面。

### 3.7.1 调试标记和调试组

对于错误信息和调试工具，可以对命令缓冲区内的操作进行标记（参见 3.2.4 错误消息和调试标签）。

- `insertDebugMarker(markerLabel)` 在一个命令流中标记一个点。
- `pushDebugGroup(groupLabel)` / `popDebugGroup()` 可嵌套地划定命令流的子流。例如，这可以用来标记一个命令缓冲区的哪一部分对应于不同的物体或场景的哪一部分。

### 3.7.2 渲染通道

> ISSUE 4 简短的介绍下渲染通道？

## 3.8 渲染管线

## 3.9 图像、视频和 `Canvas` 输入

> ISSUE 5  截至本文编写时，确切的 API 仍在变化之中。

WebGPU 在很大程度上是与 Web 平台的其他部分隔离的，但有几个交互点。其中之一是向 API 输入图像数据。除了一般的数据读写机制（`writeTexture`、`writeBuffer` 和 `mapAsync`）外，数据还可以来自`<img>` / `ImageBitmap`、`canvas`和 `video`。有很多实例都需要这些功能，包括：

- 从编码的图像（JPEG、PNG等）初始化纹理。

- 用 2D 画布渲染文本，然后在 WebGPU 中使用。

- 用于图像处理、机器学习、3D 场景等的视频元素和摄像头输入。

有两种途径可以实现：

- `copyExternalImageToTexture()` 将图像 / 视频 / `canvas` 对象的一个子矩形的颜色数据复制到 `GPUTexture` 的一个同等大小的子矩形中。在调用此命令的那一刻将会进行数据截取。
- `importTexture()`接收一个视频或 `canvas`，并创建一个 `GPUExternalTexture` 对象，如果该视频或 `canvas` 的底层资源已经存在于（同一）GPU 上，它可以提供对底层资源的直接读取访问权限，避免了不必要的复制或 CPU-GPU 传输带宽的浪费。这通常适用于硬件解码的视频和大多数 `canvas` 元素。

> ISSUE 6 更新方法名称

### 3.9.1 `GPUExternalTexture`

`GPUExternalTexture` 是一个可采样的纹理对象，其使用方式与普通可采样的 `GPUTexture` 对象类似。特别是，它可以作为纹理资源绑定到着色器上，并直接从 GPU 上使用：当它被绑定时，附加的元数据允许 WebGPU "自动 "将数据从其基础表示（例如 YUV ）转换为 RGB 采样数据。

`GPUExternalTexture` 代表一个特定的导入图像，因此导入后，无论是从内部（WebGPU）还是外部（Web 平台）访问，底层数据都不能改变。

> ISSUE 7 描述一下对于 `video` 标签、VideoFrame、`canvas`标签，以及 `OffscreenCanvas` 是如何实现的。

## 3.10 向 Canvas 输出图像

历史上，绘图 API（Canvas2D、WebGL）都是使用 `getContext()` 从`<canvas>`画布上初始化的。然而，WebGPU 不仅仅是一个绘图 API，许多应用程序不需要画布。所以 WebGPU 的初始化并不需要画布 —— 参见 3.1.1 选择适配器和初始化设备。

所以，WebGPU 也没有一个所谓的 "默认" 绘图缓冲区。相反，WebGPU 设备可以连接到任意数量的画布（零或更多），并在每一帧中渲染任意数量的画布。

画布上下文的创建和 WebGPU 设备的创建是解耦的。任何 `GPUCanvasContext` 都可以动态地与任何 `GPUDevice` 一起使用。这使得设备切换变得很容易（例如，在从丢失设备后恢复）。(相比之下，WebGL 上下文的恢复是在同一个 `WebGLRenderingContext` 对象上进行的，尽管上下文的状态在丢失/恢复时也不会持久保存）。)

为了访问画布，应用程序从 `GPUCanvasContext` 处取得一个 `GPUTexture`，然后将数据写入其中，就像使用普通的 `GPUTexture` 那样。

### 3.10.1 交换链

画布的 `GPUTexture` 是以一种非常结构化的方式提供的。

`canvas.getContext('gpupresent')`提供一个 `GPUCanvasContext`。

`GPUCanvasContext.configureSwapChain({ device, format, usage })` 提供了一个 `GPUSwapChain`，并使之前的任何交换链失效，将画布附着到所提供的设备上，并为该纹理设置 `GPUTextureFormat` 和 `GPUTextureUsage`。

`GPUSwapChain.getCurrentTexture()`提供一个 `GPUTexture`。

这个结构提供了与本地图形 API 的最大兼容性和多种优化方式。在这些 API 中，都有一个典型特征，某个特定平台的 "Surface"对象可以产生一个叫做 "交换链"的API 对象，它可能提供了一个可能是固定的1到3个纹理列表来进行渲染。

### 3.10.2 当前纹理

对于每个 `GPUSwapChain` 对象，都可以通过 `getCurrentTexture()` 方法获取当前纹理。对于 `<canvas>` 元素，返回*当前帧*的纹理。

- 当调用 `getCurrentTexture()` 方法是，如果当前帧不存在，那么就会创建一个，并且返回。
- 在更新渲染的过程中，浏览器的合成器会接管当前帧用于显示，然后内部插槽将会被清空用于下一帧。

### 3.10.3 ``getSwapChainPreferredFormat()``

由于帧缓冲硬件的差异，不同的设备有不同的首选字节布局用于显示图形。虽然可以在所有系统上都使用同一个允许的格式，但应用程序可以通过使用首选格式来节省电力。此确切的格式不能被隐藏，因为格式是可以观察到的 —— 例如，在 `copyBufferToTexture` 调用的行为中，以及在与渲染管道（其中需要指定格式，见`GPUColorTargetState.format`）的兼容规则中。

桌面时代的硬件通常更喜欢 `bgra8unorm`（4个字节的 BGRA 顺序），而移动时代的硬件通常更喜欢 `rgba8unorm`（4个字节的 RGBA 顺序）。

对于高比特位深度值，不同的系统也可能喜欢不同的格式，如 `rgba16float` 或 `rgb10a2unorm`。

### 3.10.4 多显示器

有些系统有多个具有不同功能的显示器（如 HDR 与非 HDR）。浏览器窗口可以在这些显示器之间移动。

就像今天的 WebGL 一样，用户代理可以自己决定如何对外暴露这些功能，例如，选择初始、主要或功能最强大的显示器特性。

在未来，可能会提供一个事件，允许应用程序检测画布何时移动到具有不同属性的显示器上，这样就可以再次调用 `getSwapChainPreferredFormat()` 和`configureSwapChain()`。

#### 3.10.4.1 多适配器

一些系统，当它有多个显示器时，每个显示器可能会被连接到不同的硬件适配器；例如，具有可切换图形芯片的笔记本电脑可能将内部显示器连接到集成 GPU 上，而 HDMI 端口则连接到独立 GPU 上。

这可能会产生开销，因为在一个适配器上渲染、但在另一个适配器上显示，通常会在 PCI 总线上造成一个额外拷贝或直接内存访问（DMA）。

目前，WebGPU 并没有提供一种方法来检测哪种适配器最适合给定的显示器。在未来，应用程序可能会检测到这一点，并在发生这一变化时接收事件。

## 3.11 位标记

WebGPU 在多个地方都使用了 C 风格的位标记（例如在标准全文中搜索 `GPUFlagsConstant` ）。一个典型的位标记定义如下：

```typescript
typedef [EnforceRange] unsigned long GPUColorWriteFlags;
[Exposed=Window]
namespace GPUColorWrite {
    const GPUFlagsConstant RED   = 0x1;
    const GPUFlagsConstant GREEN = 0x2;
    const GPUFlagsConstant BLUE  = 0x4;
    const GPUFlagsConstant ALPHA = 0x8;
    const GPUFlagsConstant ALL   = 0xF;
};
```

之所以选择这个方法，是因为目前在 JavaScript 中没有其他特别人性化的方法来描述 "枚举集"。

位标记在 WebGL 中就曾被使用，许多 WebGPU 的开发者都会对它很熟悉。它们也与许多本地语言使用的 API 绑定相似。

最接近的选择是`<enum type>`序列，但它不能自然地描述一个无序的唯一项目集，而且不容易允许实现类似于上面 `GPUColorWrite.ALL` 那样的效果。此外，`<enum type>`序列有很大的开销，所以我们必须在任何有可能被高频调用的 API 中避免它（如命令编码器方法），但这就导致与其他使用了该序列的 API 不一致。

另见问题[#747](https://github.com/gpuweb/gpuweb/issues/747)，其中提到 JavaScript 中的强类型位标记会很有用。

# 4 安全和隐私（自审）

本节是安全和隐私的自我审查。你也可以参考规范中的[恶意使用部分](https://gpuweb.github.io/gpuweb/#malicious-use)。

## 4.1 这项功能可能会向网站或其他方暴露哪些信息，以及这种暴露是出于什么目的？
该功能暴露了关于系统的 GPU（或缺乏 GPU ）的信息。

它允许通过请求 `GPUAdapter` 来确定系统中的一个 GPU 是否支持 WebGPU，而不需要回滚到软件适配器。如果系统只提供不支持硬件加速的 WebGPU 实现，这对于网站能够回退到硬件加速的 WebGL 是必要的。

对于要求的适配器，该功能公开了 `GPUAdapter` 支持的名称、一组可选的 WebGPU 功能，以及 `GPUAdapter`支持的一组能力限制的数字最大值。这是必要的，因为 GPU 硬件多样性丰富，虽然 WebGPU 的目标是维护最低限度的共同标准，但其目的是在硬件允许的情况下，扩展到暴露更强大的功能。这个名字可以在用户选择时显示出来，例如让用户选择一个适配器，也可以被网站用来做 GPU 特定的变通（这在过去对 WebGL 很关键）。

请注意，用户代理控制着哪些名称、可选功能和限制被公开。对于某个功能，网站不可能区分出是硬件不支持它还是用户代理选择不公开它。预计用户代理将对 GPU 的实际能力进行分组，并且只向网站公开有限的此类分组。

## 4.2 规范中的功能是否暴露了足够实现其预期用途所需的最小数量的信息？
是的。WebGPU 只要求公开硬件加速的 WebGPU 是否可用，而无需解释原因，或浏览器选择不公开等。

对于名称、可选功能和限制，暴露的信息没有被指定为最小值，因为每个网站可能需要不同的限制和可选功能的子集。相反，信息的暴露是由用户代理控制的，预计只暴露少量的一些内容集合，这些都集合暴露相同的信息。

## 4.3. 规范中的功能是如何处理个人信息、个人身份信息（PII）或由此产生的信息的？
WebGPU 不处理 PII，除非网站把 PII 放在 API 里面，这意味着 JavaScript 在 WebGPU 之前就能获得 PII。

## 4.4. 规范中的功能是如何处理敏感信息的？
WebGPU 并不处理敏感信息。然而，它所暴露的一些信息可能与敏感信息相关：通过探测某个强大的可选功能的存在或通过快速的 GPU 计算，可以推断出当前正在访问一个“高端”  GPU，这本身就与其他信息相关联。

## 4.5. 规范中的功能是否为某个源引入了新的状态，并在浏览会话中持续存在？
WebGPU 规范并没有引入新的状态。然而，实现者应该对编译着色器和管道的结果进行缓存。这就引入了可以通过测量一组着色器和管线的编译时间来检查的状态。请注意，GPU 驱动也有自己的缓存，所以用户代理必须找到禁用该缓存的方法（否则状态可能会在不同的源上被泄露）。

## 4.6. 规范中的功能是否向源暴露了关于底层平台的信息？
是的，该规范暴露了硬件加速的 WebGPU 是否可用，以及一个由用户代理控制的名称和一组可选的功能和每个 `GPUAdapter` 支持的限制。对适配器的不同请求会返回具有不同能力的适配器，这也表明系统包含多个 GPU。

## 4.7. 本规范是否允许某个源向底层平台发送数据？
WebGPU 允许向系统的 GPU 发送数据。WebGPU 规范可以防止向硬件发送格式错误的 GPU 命令。我们也希望用户代理能够为驱动中的错误提供解决方法，这些错误甚至可能导致格式良好的 GPU 命令出现问题。

## 4.8. 本规范中的功能是否允许某个源访问用户设备上的传感器？
不允许。

## 4.9. 本规范中的特征向源暴露了哪些数据？请同时记录哪些数据与其他功能在相同或不同情况下暴露的数据是相同的。
WebGPU 暴露了硬件加速的 WebGPU 是否可用，这是一个新的数据。适配器的名称、可选功能和限制与 WebGL 的 RENDER_STRING、限制和扩展有很大的交集：即使是 WebGL 中没有的限制，也大多可以从 WebGL 暴露的其他限制中推断出来（通过推断系统有什么 GPU 模型）。

## 4.10. 本规范中的功能是否能够实现新的脚本执行/加载机制？
是的。WebGPU 允许运行用 WebGPU 着色语言（WGSL）实现指定的任意 GPU 计算。WGSL 被编译成 `GPUShaderModule` 对象，然后被用来在特定的“渲染管线”中进行 GPU 计算。

## 4.11. 本规范中的功能是否允许某个源访问其他设备？
不允许。WebGPU 允许访问插在系统中的 PCI-e 和外置 GPU，但这些只是系统的一部分。

## 4.12. 本规范中的功能是否允许源对用户代理的本地用户界面进行某种程度的控制？
不允许。然而，WebGPU可以用来渲染全屏或 WebXR，这确实改变了用户界面。WebGPU 也可以运行 GPU 的计算，如果计算时间过长，会导致设备超时和GPU 重置，这可能会产生几个全系统的黑框。请注意，这本身在“单纯的” HTML/CSS 中就是可能的引发的，但 WebGPU 更容易导致而已。

## 4.13. 本规范中的功能会创建或向网络暴露哪些临时标识符？
没有。

## 4.14. 本规范如何区分第一方和第三方背景下的行为？
第一方和第三方语境之间没有具体的行为差异。然而，用户代理可以决定限制返回给第三方上下文的 `GPUAdapter`：通过使用较少的信息，使用单一的信息，或不暴露WebGPU。

## 4.15. 本规范中的功能在浏览器的隐私浏览或隐身模式下如何工作？
在隐身模式下没有区别，但用户代理可以决定限制返回的 `GPUAdapters`。用户代理需要注意的是，在隐身模式下，不要重复使用着色器编译缓存。

## 4.16. 本规范是否有 "安全考虑因素 "和 "隐私考虑因素 "两个部分？
是的，它们都在 "[恶意使用考虑因素](https://gpuweb.github.io/gpuweb/#malicious-use)"部分下。

## 4.17. 规范中的功能是否可以让源降低默认的安全保护等级？
没有。除了 WebGPU 可以用来渲染全屏或 WebXR。

## 4.18. 这份调查问卷应该问什么？
该规范是否允许与跨源数据进行交互？与 DRM 数据？

目前 WebGPU 还不能做到这一点，但将来可能会有人要求这些功能。也许可以引入"受保护队列"的概念，只允许计算最终出现在屏幕上，而不是 JavaScript 中。然而，对 WebGL 的调查显示，即使使用了这种受保护的队列，通过 GPU 的时序也可以导致数据泄漏。

# 5 WebGPU 着色器语言

