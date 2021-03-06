/*
variables
*/
var model_VGG;
var model_LeNet;
var model_ResNet;
var canvas;
var classNames = [];
var res_classNames = []
var canvas;
var coords = [];
var mousePressed = false;
var mode;

/*
prepare the drawing canvas 
*/
$(function() {
    canvas = window._canvas = new fabric.Canvas('canvas');
    canvas.backgroundColor = '#ffffff';
    canvas.isDrawingMode = 0;
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width = 10;
    canvas.renderAll();
    //setup listeners 
    canvas.on('mouse:up', function(e) {
        getFrame();
        mousePressed = false
    });
    canvas.on('mouse:down', function(e) {
        mousePressed = true
    });
    canvas.on('mouse:move', function(e) {
        recordCoor(e)
    });
})

/*
set the table of the predictions 
*/
function setTable(top3, probs, net) {
    //loop over the predictions 
    prob_sum = probs[1] + probs[2] + probs[0]
    for (var i = 0; i < top3.length; i++) {
        let sym = document.getElementById(net + '_'+'sym' + (i + 1))
        let prob = document.getElementById(net + '_'+'prob' + (i + 1))
        sym.innerHTML = top3[i]
        console.log(probs[i])
        prob.innerHTML = Math.round(probs[i] /prob_sum * 100)
    }
    //create the pie 
    createPie(".pieID."+net + "_"+"legend", ".pieID."+net + "_"+"pie", net);

}

/*
record the current drawing coordinates
*/
function recordCoor(event) {
    var pointer = canvas.getPointer(event.e);
    var posX = pointer.x;
    var posY = pointer.y;

    if (posX >= 0 && posY >= 0 && mousePressed) {
        coords.push(pointer)
    }
}

/*
get the best bounding box by trimming around the drawing
*/
function getMinBox() {
    //get coordinates 
    var coorX = coords.map(function(p) {
        return p.x
    });
    var coorY = coords.map(function(p) {
        return p.y
    });

    //find top left and bottom right corners 
    var min_coords = {
        x: Math.min.apply(null, coorX),
        y: Math.min.apply(null, coorY)
    }
    var max_coords = {
        x: Math.max.apply(null, coorX),
        y: Math.max.apply(null, coorY)
    }

    //return as strucut 
    return {
        min: min_coords,
        max: max_coords
    }
}

/*
get the current image data 
*/
function getImageData() {
        //get the minimum bounding box around the drawing 
        const mbb = getMinBox()

        //get image data according to dpi 
        const dpi = window.devicePixelRatio
        const imgData = canvas.contextContainer.getImageData(mbb.min.x * dpi, mbb.min.y * dpi,
                                                      (mbb.max.x - mbb.min.x) * dpi, (mbb.max.y - mbb.min.y) * dpi);
        return imgData
    }

/*
get the prediction 
*/
function getFrame() {
    //make sure we have at least two recorded coordinates 
    if (coords.length >= 2) {

        //get the image data from the canvas 
        const imgData = getImageData()

        //get the prediction 
        const pred_VGG = model_VGG.predict(preprocess(imgData)).dataSync()
        const pred_LeNet = model_LeNet.predict(preprocess(imgData)).dataSync()
        const pred_ResNet = model_ResNet.predict(preprocess(imgData)).dataSync()


        //find the top 3 predictions 
        const indices_VGG = findIndicesOfMax(pred_VGG, 3)
        const probs_VGG = findTopValues(pred_VGG, 3)
        const names_VGG = getClassNames(indices_VGG)

        const indices_LeNet = findIndicesOfMax(pred_LeNet, 3)
        const probs_LeNet = findTopValues(pred_LeNet, 3)
        const names_LeNet = getClassNames(indices_LeNet)

        const indices_ResNet = findIndicesOfMax(pred_ResNet, 3)
        const probs_ResNet = findTopValues(pred_ResNet, 3)
        const names_ResNet = getResClassNames(indices_ResNet)
        //set the table 
        setTable(names_VGG, probs_VGG, 'vgg')
        setTable(names_LeNet, probs_LeNet, 'le')
        setTable(names_ResNet, probs_ResNet, 'res')


    }

}

/*
get the the class names 
*/
function getClassNames(indices) {
    var outp = []
    for (var i = 0; i < indices.length; i++)
        outp[i] = classNames[indices[i]]
    return outp
}

function getResClassNames(indices){
    var outp = []
    for (var i = 0; i < indices.length; i++)
        outp[i] = res_classNames[indices[i]]
    return outp
}

/*
load the class names 
*/
async function loadDict() {
    if (mode == 'ar'){
        loc = 'model_LeNet/class_names_ar.txt'
    }
    else{
        loc = 'model_LeNet/class_names.txt'
        loc_res = 'model_ResNet/class_names.txt'
    }
        
    
    await $.ajax({
        url: loc,
        dataType: 'text',
    }).done(success);

    await $.ajax({
        url: loc_res,
        dataType: 'text',
    }).done(res_success);

}

/*
load the class names
*/
function success(data) {
    const lst = data.split(/\n/)
    for (var i = 0; i < lst.length - 1; i++) {
        let symbol = lst[i]
        classNames[i] = symbol
        
    }
}
function res_success(data) {
    const lst = data.split(/\n/)
    for (var i = 0; i < lst.length - 1; i++) {
        let symbol = lst[i]
        res_classNames[i] = symbol
        
    }
}

/*
get indices of the top probs
*/
function findIndicesOfMax(inp, count) {
    var outp = [];
    for (var i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
        if (outp.length > count) {
            outp.sort(function(a, b) {
                return inp[b] - inp[a];
            }); // descending sort the output array
            outp.pop(); // remove the last index (index of smallest element in output array)
        }
    }
    return outp;
}

/*
find the top 3 predictions
*/
function findTopValues(inp, count) {
    var outp = [];
    let indices = findIndicesOfMax(inp, count)
    // show 3 greatest scores
    for (var i = 0; i < indices.length; i++)
        outp[i] = inp[indices[i]]
    return outp
}

/*
preprocess the data
*/
function preprocess(imgData) {
    return tf.tidy(() => {
        //convert to a tensor 
        let tensor = tf.fromPixels(imgData, numChannels = 1)
        
        //resize 
        const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()
        
        //normalize 
        const offset = tf.scalar(255.0);
        const normalized = tf.scalar(1.0).sub(resized.div(offset));

        //We add a dimension to get a batch shape 
        const batched = normalized.expandDims(0)
        return batched
    })
}

/*
load the model
*/
async function start(cur_mode) {
    //arabic or english
    mode = cur_mode
    
    //load the model 
    model_VGG = await tf.loadModel('model_VGG/model.json')
    model_LeNet = await tf.loadModel('model_LeNet/model.json')
    model_ResNet = await tf.loadModel('model_ResNet/model.json')

    
    //warm up 
    model_VGG.predict(tf.zeros([1, 28, 28, 1]))
    model_LeNet.predict(tf.zeros([1, 28, 28, 1]))
    model_ResNet.predict(tf.zeros([1, 28, 28, 1]))
    
    //allow drawing on the canvas 
    allowDrawing()
    
    //load the class names
    await loadDict()
}

/*
allow drawing on canvas
*/
function allowDrawing() {
    canvas.isDrawingMode = 1;
    if (mode == 'en')
        document.getElementById('status').innerHTML = 'Model Loaded';
    else
        document.getElementById('status').innerHTML = 'تم التحميل';
    $('button').prop('disabled', false);
    var slider = document.getElementById('myRange');
    slider.oninput = function() {
        canvas.freeDrawingBrush.width = this.value;
    };
}

/*
clear the canvs 
*/
function erase() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
}