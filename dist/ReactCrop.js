'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _objectAssign = require('object-assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ReactCrop = _react2.default.createClass({
	displayName: 'ReactCrop',


	propTypes: {
		src: _react2.default.PropTypes.string.isRequired,
		crop: _react2.default.PropTypes.object,
		minWidth: _react2.default.PropTypes.number,
		minHeight: _react2.default.PropTypes.number,
		keepSelection: _react2.default.PropTypes.bool,
		onChange: _react2.default.PropTypes.func,
		onComplete: _react2.default.PropTypes.func,
		onImageLoaded: _react2.default.PropTypes.func
	},

	xOrds: ['e', 'w'],
	yOrds: ['n', 's'],
	xyOrds: ['nw', 'ne', 'se', 'sw'],

	arrowKey: {
		left: 37,
		up: 38,
		right: 39,
		down: 40
	},
	nudgeStep: 0.2,

	defaultCrop: {
		x: 0,
		y: 0,
		width: 0,
		height: 0,
		aspect: false
	},

	getInitialState: function getInitialState() {
		var props = arguments.length <= 0 || arguments[0] === undefined ? this.props : arguments[0];

		var crop = (0, _objectAssign2.default)({}, this.defaultCrop, props.crop);

		this.cropInvalid = !crop.width || !crop.height;

		return {
			crop: crop
		};
	},
	componentDidMount: function componentDidMount() {
		document.addEventListener('mousemove', this.onDocMouseTouchMove);
		document.addEventListener('touchmove', this.onDocMouseTouchMove);

		document.addEventListener('mouseup', this.onDocMouseTouchEnd);
		document.addEventListener('touchend', this.onDocMouseTouchEnd);
		document.addEventListener('touchcancel', this.onDocMouseTouchEnd);
	},
	componentWillUnmount: function componentWillUnmount() {
		document.removeEventListener('mousemove', this.onDocMouseTouchMove);
		document.removeEventListener('touchmove', this.onDocMouseTouchMove);

		document.removeEventListener('mouseup', this.onDocMouseTouchEnd);
		document.removeEventListener('touchend', this.onDocMouseTouchEnd);
		document.removeEventListener('touchcancel', this.onDocMouseTouchEnd);
	},
	componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
		this.setState(this.getInitialState(nextProps));
	},
	getCropStyle: function getCropStyle() {
		return {
			top: this.state.crop.y + '%',
			left: this.state.crop.x + '%',
			width: this.state.crop.width + '%',
			height: this.state.crop.height + '%'
		};
	},
	straightenYPath: function straightenYPath(clientX) {
		var evData = this.evData;
		var ord = evData.ord;
		var cropOffset = evData.cropOffset;
		var cropStartWidth = evData.cropStartWidth / 100 * evData.imageWidth;
		var cropStartHeight = evData.cropStartHeight / 100 * evData.imageHeight;
		var k = undefined,
		    d = undefined;

		if (ord === 'nw' || ord === 'se') {
			k = cropStartHeight / cropStartWidth;
			d = cropOffset.top - cropOffset.left * k;
		} else {
			k = -cropStartHeight / cropStartWidth;
			d = cropOffset.top + cropStartHeight - cropOffset.left * k;
		}

		return k * clientX + d;
	},
	onDocMouseTouchMove: function onDocMouseTouchMove(e) {
		if (!this.mouseDownOnCrop) {
			return;
		}

		var crop = this.state.crop;
		var evData = this.evData;
		var clientPos = this.getClientPos(e);

		if (evData.isResize && crop.aspect && evData.cropOffset) {
			clientPos.y = this.straightenYPath(clientPos.x);
		}

		var xDiffPx = clientPos.x - evData.clientStartX;
		evData.xDiffPc = xDiffPx / evData.imageWidth * 100;

		var yDiffPx = clientPos.y - evData.clientStartY;
		evData.yDiffPc = yDiffPx / evData.imageHeight * 100;

		if (evData.isResize) {
			this.resizeCrop();
		} else {
			this.dragCrop();
		}

		this.cropInvalid = false;

		if (this.props.onChange) {
			this.props.onChange(crop);
		}

		this.setState({ crop: crop });
	},
	getNewSize: function getNewSize() {
		var crop = this.state.crop;
		var evData = this.evData;
		var imageAspect = evData.imageWidth / evData.imageHeight;

		// New width.
		var newWidth = evData.cropStartWidth + evData.xDiffPc;

		if (evData.xCrossOver) {
			newWidth = Math.abs(newWidth);
		}

		var maxWidth = 100;

		// Stop the box expanding on the opposite side when some edges are hit.
		if (!this.state.newCropIsBeingDrawn) {
			maxWidth = ['nw', 'w', 'sw'].indexOf(evData.inversedXOrd || evData.ord) > -1 ? evData.cropStartX : 100 - evData.cropStartX;
		}

		newWidth = this.clamp(newWidth, this.props.minWidth || 0, maxWidth);

		// New height.
		var newHeight = undefined;

		if (crop.aspect) {
			newHeight = newWidth / crop.aspect * imageAspect;
		} else {
			newHeight = evData.cropStartHeight + evData.yDiffPc;
		}

		if (evData.yCrossOver) {
			// Cap if polarity is inversed and the shape fills the y space.
			newHeight = Math.min(Math.abs(newHeight), evData.cropStartY);
		}

		var maxHeight = 100;

		// Stop the box expanding on the opposite side when some edges are hit.
		if (!this.state.newCropIsBeingDrawn) {
			maxHeight = ['nw', 'n', 'ne'].indexOf(evData.inversedYOrd || evData.ord) > -1 ? evData.cropStartY : 100 - evData.cropStartY;
		}

		newHeight = this.clamp(newHeight, this.props.minHeight || 0, maxHeight);

		if (crop.aspect) {
			newWidth = newHeight * crop.aspect / imageAspect;
		}

		return {
			width: newWidth,
			height: newHeight
		};
	},
	resizeCrop: function resizeCrop() {
		var crop = this.state.crop;
		var evData = this.evData;
		var ord = evData.ord;

		// On the inverse change the diff so it's the same and
		// the same algo applies.
		if (evData.xInversed) {
			evData.xDiffPc -= evData.cropStartWidth * 2;
		}
		if (evData.yInversed) {
			evData.yDiffPc -= evData.cropStartHeight * 2;
		}

		// New size.
		var newSize = this.getNewSize();

		// Adjust x/y to give illusion of 'staticness' as width/height is increased
		// when polarity is inversed.
		var newX = evData.cropStartX;
		var newY = evData.cropStartY;

		if (evData.xCrossOver) {
			newX = crop.x + (crop.width - newSize.width);
		}

		if (evData.yCrossOver) {
			// This not only removes the little "shake" when inverting at a diagonal, but for some
			// reason y was way off at fast speeds moving sw->ne with fixed aspect only, I couldn't
			// figure out why.
			if (evData.lastYCrossover === false) {
				newY = crop.y - newSize.height;
			} else {
				newY = crop.y + (crop.height - newSize.height);
			}
		}

		crop.x = this.clamp(newX, 0, 100 - newSize.width);
		crop.y = this.clamp(newY, 0, 100 - newSize.height);

		// Apply width/height changes depending on ordinate.
		if (this.xyOrds.indexOf(ord) > -1) {
			crop.width = newSize.width;
			crop.height = newSize.height;
		} else if (this.xOrds.indexOf(ord) > -1) {
			crop.width = newSize.width;
		} else if (this.yOrds.indexOf(ord) > -1) {
			crop.height = newSize.height;
		}

		evData.lastYCrossover = evData.yCrossOver;
		this.crossOverCheck();
	},
	dragCrop: function dragCrop() {
		var crop = this.state.crop;
		var evData = this.evData;
		crop.x = this.clamp(evData.cropStartX + evData.xDiffPc, 0, 100 - crop.width);
		crop.y = this.clamp(evData.cropStartY + evData.yDiffPc, 0, 100 - crop.height);
	},
	inverseOrd: function inverseOrd(ord) {
		var inverseOrd = undefined;

		if (ord === 'n') inverseOrd = 's';else if (ord === 'ne') inverseOrd = 'sw';else if (ord === 'e') inverseOrd = 'w';else if (ord === 'se') inverseOrd = 'nw';else if (ord === 's') inverseOrd = 'n';else if (ord === 'sw') inverseOrd = 'ne';else if (ord === 'w') inverseOrd = 'e';else if (ord === 'nw') inverseOrd = 'se';

		return inverseOrd;
	},
	crossOverCheck: function crossOverCheck() {
		var evData = this.evData;

		if (!evData.xCrossOver && -Math.abs(evData.cropStartWidth) - evData.xDiffPc >= 0 || evData.xCrossOver && -Math.abs(evData.cropStartWidth) - evData.xDiffPc <= 0) {
			evData.xCrossOver = !evData.xCrossOver;
		}

		if (!evData.yCrossOver && -Math.abs(evData.cropStartHeight) - evData.yDiffPc >= 0 || evData.yCrossOver && -Math.abs(evData.cropStartHeight) - evData.yDiffPc <= 0) {
			evData.yCrossOver = !evData.yCrossOver;
		}

		var swapXOrd = evData.xCrossOver !== evData.startXCrossOver;
		var swapYOrd = evData.yCrossOver !== evData.startYCrossOver;

		evData.inversedXOrd = swapXOrd ? this.inverseOrd(evData.ord) : false;
		evData.inversedYOrd = swapYOrd ? this.inverseOrd(evData.ord) : false;
	},
	onCropMouseTouchDown: function onCropMouseTouchDown(e) {
		e.preventDefault(); // Stop drag selection.

		var crop = this.state.crop;
		var clientPos = this.getClientPos(e);

		// Focus for detecting keypress.
		this.refs.component.focus();

		var ord = e.target.dataset.ord;
		var xInversed = ord === 'nw' || ord === 'w' || ord === 'sw';
		var yInversed = ord === 'nw' || ord === 'n' || ord === 'ne';

		var cropOffset = undefined;

		if (crop.aspect) {
			cropOffset = this.getElementOffset(this.refs.cropSelect);
		}

		this.evData = {
			imageWidth: this.refs.image.width,
			imageHeight: this.refs.image.height,
			clientStartX: clientPos.x,
			clientStartY: clientPos.y,
			cropStartWidth: crop.width,
			cropStartHeight: crop.height,
			cropStartX: xInversed ? crop.x + crop.width : crop.x,
			cropStartY: yInversed ? crop.y + crop.height : crop.y,
			xInversed: xInversed,
			yInversed: yInversed,
			xCrossOver: xInversed,
			yCrossOver: yInversed,
			startXCrossOver: xInversed,
			startYCrossOver: yInversed,
			isResize: e.target !== this.refs.cropSelect,
			ord: ord,
			cropOffset: cropOffset
		};

		this.mouseDownOnCrop = true;
	},
	getClientPos: function getClientPos(e) {
		var pageX = undefined,
		    pageY = undefined;

		if (e.touches) {
			pageX = e.touches[0].pageX;
			pageY = e.touches[0].pageY;
		} else {
			pageX = e.pageX;
			pageY = e.pageY;
		}

		return {
			x: pageX,
			y: pageY
		};
	},
	onComponentMouseTouchDown: function onComponentMouseTouchDown(e) {
		if (e.target !== this.refs.imageCopy && e.target !== this.refs.cropWrapper) {
			return;
		}

		e.preventDefault(); // Stop drag selection.

		var crop = this.props.keepSelection === true ? {} : this.state.crop;
		var clientPos = this.getClientPos(e);

		// Focus for detecting keypress.
		this.refs.component.focus();

		var imageOffset = this.getElementOffset(this.refs.image);
		var xPc = (clientPos.x - imageOffset.left) / this.refs.image.width * 100;
		var yPc = (clientPos.y - imageOffset.top) / this.refs.image.height * 100;

		crop.x = xPc;
		crop.y = yPc;
		crop.width = 0;
		crop.height = 0;

		this.evData = {
			imageWidth: this.refs.image.width,
			imageHeight: this.refs.image.height,
			clientStartX: clientPos.x,
			clientStartY: clientPos.y,
			cropStartWidth: crop.width,
			cropStartHeight: crop.height,
			cropStartX: crop.x,
			cropStartY: crop.y,
			xInversed: false,
			yInversed: false,
			xCrossOver: false,
			yCrossOver: false,
			startXCrossOver: false,
			startYCrossOver: false,
			isResize: true,
			ord: 'nw'
		};

		this.mouseDownOnCrop = true;
		this.setState({ newCropIsBeingDrawn: true });
	},
	onComponentKeyDown: function onComponentKeyDown(e) {
		var keyCode = e.which;
		var crop = this.state.crop;
		var nudged = false;

		if (!crop.width || !crop.height) {
			return;
		}

		if (keyCode === this.arrowKey.left) {
			crop.x -= this.nudgeStep;
			nudged = true;
		} else if (keyCode === this.arrowKey.right) {
			crop.x += this.nudgeStep;
			nudged = true;
		} else if (keyCode === this.arrowKey.up) {
			crop.y -= this.nudgeStep;
			nudged = true;
		} else if (keyCode === this.arrowKey.down) {
			crop.y += this.nudgeStep;
			nudged = true;
		}

		if (nudged) {
			if (e) {
				e.preventDefault();
			}
			crop.x = this.clamp(crop.x, 0, 100 - crop.width);
			crop.y = this.clamp(crop.y, 0, 100 - crop.height);

			this.setState({ crop: crop });

			if (this.props.onChange) {
				this.props.onChange(crop);
			}
			if (this.props.onComplete) {
				this.props.onComplete(crop);
			}
		}
	},
	onDocMouseTouchEnd: function onDocMouseTouchEnd(e) {
		if (this.mouseDownOnCrop) {

			this.cropInvalid = !this.state.crop.width && !this.state.crop.height;
			this.mouseDownOnCrop = false;

			if (this.props.onComplete) {
				this.props.onComplete(this.state.crop);
			}

			this.setState({ newCropIsBeingDrawn: false });
		}
	},
	getElementOffset: function getElementOffset(el) {
		var rect = el.getBoundingClientRect();
		var docEl = document.documentElement;

		var rectTop = rect.top + window.pageYOffset - docEl.clientTop;
		var rectLeft = rect.left + window.pageXOffset - docEl.clientLeft;

		return {
			top: rectTop,
			left: rectLeft
		};
	},
	clamp: function clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	},
	createCropSelection: function createCropSelection() {
		var style = this.getCropStyle();

		return _react2.default.createElement(
			'div',
			{ ref: 'cropSelect',
				style: style,
				className: 'ReactCrop--crop-selection',
				onMouseDown: this.onCropMouseTouchDown,
				onTouchStart: this.onCropMouseTouchDown },
			_react2.default.createElement('div', { className: 'ReactCrop--drag-bar ord-n', 'data-ord': 'n' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-bar ord-e', 'data-ord': 'e' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-bar ord-s', 'data-ord': 's' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-bar ord-w', 'data-ord': 'w' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-nw', 'data-ord': 'nw' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-n', 'data-ord': 'n' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-ne', 'data-ord': 'ne' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-e', 'data-ord': 'e' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-se', 'data-ord': 'se' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-s', 'data-ord': 's' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-sw', 'data-ord': 'sw' }),
			_react2.default.createElement('div', { className: 'ReactCrop--drag-handle ord-w', 'data-ord': 'w' })
		);
	},
	arrayDividedBy100: function arrayDividedBy100(arr) {
		var delimeter = arguments.length <= 1 || arguments[1] === undefined ? ' ' : arguments[1];

		return arr.map(function (number) {
			return number / 100;
		}).join(delimeter);
	},
	arrayToPercent: function arrayToPercent(arr) {
		var delimeter = arguments.length <= 1 || arguments[1] === undefined ? ' ' : arguments[1];

		return arr.map(function (number) {
			return number + '%';
		}).join(delimeter);
	},
	getPolygonValues: function getPolygonValues(forSvg) {
		var crop = this.state.crop;
		var pTopLeft = [crop.x, crop.y];
		var pTopRight = [crop.x + crop.width, crop.y];
		var pBottomLeft = [crop.x, crop.y + crop.height];
		var pBottomRight = [crop.x + crop.width, crop.y + crop.height];

		if (forSvg) {
			pTopLeft = this.arrayDividedBy100(pTopLeft);
			pTopRight = this.arrayDividedBy100(pTopRight);
			pBottomLeft = this.arrayDividedBy100(pBottomLeft);
			pBottomRight = this.arrayDividedBy100(pBottomRight);
		} else {
			pTopLeft = this.arrayToPercent(pTopLeft);
			pTopRight = this.arrayToPercent(pTopRight);
			pBottomLeft = this.arrayToPercent(pBottomLeft);
			pBottomRight = this.arrayToPercent(pBottomRight);
		}
		return {
			top: {
				left: pTopLeft,
				right: pTopRight
			},
			bottom: {
				left: pBottomLeft,
				right: pBottomRight
			}
		};
	},
	getPolygonClipPath: function getPolygonClipPath() {
		var _getPolygonValues = this.getPolygonValues();

		var top = _getPolygonValues.top;
		var bottom = _getPolygonValues.bottom;

		return 'polygon(' + top.left + ', ' + top.right + ', ' + bottom.right + ', ' + bottom.left + ')';
	},
	onImageLoad: function onImageLoad(e) {
		var crop = this.state.crop;
		var image = e.target;
		var imageWidth = image.naturalWidth;
		var imageHeight = image.naturalHeight;
		var imageAspect = imageWidth / imageHeight;

		// If there is a width or height then infer the other to
		// ensure the value is correct.
		if (crop.aspect) {
			if (crop.width) {
				crop.height = crop.width / crop.aspect * imageAspect;
			} else if (crop.height) {
				crop.width = crop.height * crop.aspect / imageAspect;
			}
			this.adjustOnImageLoadCrop(crop, imageAspect);
			this.cropInvalid = !crop.width || !crop.height;
			this.setState({ crop: crop });
		}
		if (this.props.onImageLoaded) {
			this.props.onImageLoaded(crop, image);
		}
	},
	adjustOnImageLoadCrop: function adjustOnImageLoadCrop(crop, imageAspect) {
		if (crop.y + crop.height > 100) {
			crop.height = 100 - crop.y;
			crop.width = crop.height * crop.aspect / imageAspect;
		}
		if (crop.x + crop.width > 100) {
			crop.width = 100 - crop.x;
			crop.height = crop.width / crop.aspect * imageAspect;
		}
	},


	// We used dangerouslySetInnerHTML because react refuses to add the attribute 'clipPathUnits' to the rendered DOM
	getClipPathHtml: function getClipPathHtml() {
		var _getPolygonValues2 = this.getPolygonValues(true);

		var top = _getPolygonValues2.top;
		var bottom = _getPolygonValues2.bottom;

		return {
			__html: '<clipPath id="ReactCropperClipPolygon" clipPathUnits="objectBoundingBox">\n\t\t\t\t\t\t<polygon points="' + top.left + ', ' + top.right + ', ' + bottom.right + ', ' + bottom.left + '" />\n\t\t\t\t\t</clipPath>'
		};
	},
	renderSvg: function renderSvg() {
		return _react2.default.createElement(
			'svg',
			{ width: '0', height: '0', style: { position: 'absolute', top: '0', left: '0' } },
			_react2.default.createElement('defs', { dangerouslySetInnerHTML: this.getClipPathHtml() })
		);
	},
	render: function render() {
		var cropSelection = undefined,
		    imageClip = undefined;

		if (!this.cropInvalid) {
			cropSelection = this.createCropSelection();
			imageClip = {
				WebkitClipPath: this.getPolygonClipPath(),
				clipPath: 'url("#ReactCropperClipPolygon")'
			};
		}

		var componentClasses = ['ReactCrop'];

		if (this.state.newCropIsBeingDrawn) {
			componentClasses.push('ReactCrop-new-crop');
		}
		if (this.state.crop.aspect) {
			componentClasses.push('ReactCrop-fixed-aspect');
		}

		return _react2.default.createElement(
			'div',
			{ ref: 'component',
				className: componentClasses.join(' '),
				onTouchStart: this.onComponentMouseTouchDown,
				onMouseDown: this.onComponentMouseTouchDown,
				tabIndex: '1',
				onKeyDown: this.onComponentKeyDown },
			this.renderSvg(),
			_react2.default.createElement('img', { ref: 'image', className: 'ReactCrop--image', src: this.props.src, onLoad: this.onImageLoad }),
			_react2.default.createElement(
				'div',
				{ className: 'ReactCrop--crop-wrapper', ref: 'cropWrapper' },
				_react2.default.createElement('img', { ref: 'imageCopy', className: 'ReactCrop--image-copy', src: this.props.src, style: imageClip }),
				cropSelection
			),
			this.props.children
		);
	}
});

exports.default = ReactCrop;
